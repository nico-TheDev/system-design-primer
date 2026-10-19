# Designing a read heavy cache layer

A cache is a promise that you can answer a question faster than the place that really knows the answer. Most systems that grow past a single database discover this the hard way: the first slow page, the first traffic spike, the first night of pager alerts. This article walks through how to design a cache layer for a read heavy service, what goes wrong, and how to decide among the common strategies. It is a long piece on purpose, because it is also the sample text that proves the reading styles of this app hold up over many screens.

By the end you should be able to explain why a cache helps, pick a placement and a write policy, size it from a few measurements, and name the failure modes before they find you.

## Why a cache helps at all

A database does a lot of work for each query: it parses the request, plans it, reads pages from disk or memory, applies filters, and sends the rows back over the network. A cache skips most of that. It holds the finished answer, keyed by something cheap to compute, and returns it in a fraction of the time.

Two facts make this work. The first is that reads are usually much more common than writes. A product page may be viewed ten thousand times for every edit. The second is that popular items are very popular. In most real traffic a small slice of the keys receives most of the requests, so a small cache can absorb a large share of the load.

> A cache does not make your system faster. It makes the common case faster, and it makes the uncommon case more complicated.

That second half is the part people forget. Every cache adds a second copy of the truth, and two copies can disagree. Most of the design work below is about deciding how much disagreement you can live with and for how long.

### The numbers worth knowing

You do not need exact figures to reason about a cache, but you do need the right order of magnitude. The table below uses round numbers that are close enough for planning.

| Operation | Typical latency | Relative cost |
|---|---:|---:|
| Read from local process memory | 100 ns | 1 |
| Read from a nearby in memory cache over the network | 0.5 ms | 5,000 |
| Read from a database that has the page cached | 2 ms | 20,000 |
| Read from a database that must go to disk | 10 ms | 100,000 |
| Read from another region | 80 ms | 800,000 |

The jump from memory to the network is the one that surprises people. A cache that lives in another process is still hundreds of times slower than a variable in your own program, which is why some systems add a second, tiny cache inside each application server. We come back to this under layers.

![A client asks the application, which checks the cache first and falls back to the database](/fixtures/cache-aside.svg "The cache aside pattern: the application owns the lookup and the fallback.")

## Where the cache sits

There are four common places to put a cache, and a mature system often uses more than one. Each placement trades freshness, cost, and control differently.

1. **In the client.** A browser or mobile app keeps responses for a while. It is free for you and invisible to your servers, but you cannot reach in and clear it.
2. **At the edge.** A content delivery network keeps copies close to users. It is excellent for static files and for pages that are the same for everyone.
3. **In front of the service.** A reverse proxy or gateway keeps whole responses. It protects every service behind it with one piece of configuration.
4. **Beside the service.** A shared in memory store, such as Redis or Memcached, holds the results of expensive work. The application decides what goes in and what comes out.

The last one is the subject of most of this article, because it is the one you design rather than switch on.

### The cache aside pattern

In the cache aside pattern the application owns the logic. On a read, it asks the cache first. On a hit it returns the cached value. On a miss it reads the database, stores the result in the cache, and returns it.

```python
def get_user(user_id: str) -> User:
    key = f"user:{user_id}"
    cached = cache.get(key)
    if cached is not None:
        return User.from_json(cached)

    user = db.fetch_user(user_id)
    if user is None:
        return None

    cache.set(key, user.to_json(), ttl_seconds=300)
    return user
```

This is simple and it fails safely. If the cache is down, every request becomes a miss and goes to the database. The database must be able to survive that, which is its own design question, but the application keeps working.

The weakness is the window between the write and the next read. When a user changes their name, the database has the new value and the cache still holds the old one until it expires or is deleted. The usual fix is to delete the cache entry as part of the write.

```python
def rename_user(user_id: str, new_name: str) -> None:
    db.update_user(user_id, name=new_name)
    cache.delete(f"user:{user_id}")
```

Notice that this deletes the entry instead of updating it. Updating the cache from the write path invites a race: two writers can finish in a different order than they started, leaving the older value in the cache. Deleting is safer, because the next reader rebuilds the entry from the database, which is the single source of truth.

<aside class="margin-note">
  Deleting after the database write still leaves a small race. A reader that fetched the old row just before the write can store it just after the delete. A short time to live is the backstop.
</aside>

### Read through and write through

In read through, the cache itself knows how to load a missing value. The application only talks to the cache, and the cache calls the database on a miss. This moves the lookup logic out of every caller and into one place.

Write through goes further: every write goes to the cache, and the cache writes to the database before it answers. Reads are always fresh, because the cache never holds a value the database does not. The cost is that every write is as slow as the slower of the two stores, and you cache many values that are never read.

Write behind, also called write back, accepts the write into the cache and persists it to the database later. It is very fast and it can batch many small writes into one. It is also the only strategy here that can lose acknowledged data if the cache fails before the flush. Use it only where losing a few seconds of writes is acceptable, such as counters and view statistics.

## Choosing a write policy

The right policy depends on how much staleness you can tolerate and how expensive a wrong answer is. A few questions settle most cases.

- How many seconds of old data is acceptable to the person reading it?
- What happens to the business if two people briefly see different values?
- Is the data cheap to recompute, or does a miss hurt?
- Can the write path reach the cache reliably?

For a profile page, thirty seconds of staleness is fine. For an account balance, it is not. For an inventory count on a product page, it depends: showing "in stock" for ten seconds too long is harmless, but the checkout must read the real number.

<aside class="callout callout-caution">
  <p class="callout-label">Caution</p>
  <div class="callout-body"><p>Never make a decision that moves money or reserves a scarce item from a cached value. Show the cached value, then confirm against the source of truth at the moment of commitment.</p></div>
</aside>

### Time to live is a policy

A time to live, or TTL, is the simplest invalidation rule: the entry disappears after a fixed time. It needs no coordination between writers and readers, and it bounds how wrong the cache can be. If the TTL is five minutes, no reader is ever more than five minutes behind.

Pick the TTL from the business answer to "how stale is acceptable", not from a habit. Then add a little random jitter so that entries created together do not expire together.

```typescript
const BASE_TTL_SECONDS = 300;
const JITTER_SECONDS = 30;

export function ttlWithJitter(): number {
  // Spread expiry over a 60 second window so a batch of keys does not expire in the same instant.
  return BASE_TTL_SECONDS + Math.floor((Math.random() * 2 - 1) * JITTER_SECONDS);
}
```

Without jitter, a deploy that warms ten thousand keys at once will see all ten thousand expire at once, five minutes later. The database then receives ten thousand queries in the same second. This failure has a name, and we meet it again below.

## Eviction: what to throw away

A cache has finite memory. When it is full, adding a new entry means removing an old one. The eviction policy decides which.

- **Least recently used (LRU)** removes the entry that has gone the longest without being touched. It works well when recent use predicts future use, which is true for most human traffic.
- **Least frequently used (LFU)** removes the entry with the fewest accesses. It protects steady favorites from being pushed out by a burst of one time requests, such as a crawler walking every page.
- **First in, first out (FIFO)** removes the oldest entry regardless of use. It is cheap and rarely the best choice.
- **Random** removes any entry. It sounds careless but it is surprisingly close to LRU on many workloads and costs almost nothing to run.

Many stores use an approximation of LRU or LFU rather than the exact algorithm, because keeping a perfect ordering of millions of keys costs more than it saves. Sampling a handful of keys and removing the worst of them gets most of the benefit.

### Sizing from measurements

You can estimate how large a cache must be from two numbers: how many distinct keys receive most of the traffic, and how big each entry is. Measure them from real logs before you buy hardware.

1. Sort keys by request count and find how many keys cover eighty percent of requests. Call this the working set.
2. Take the average serialized size of an entry, plus the per key overhead of your store, which is often around a hundred bytes.
3. Multiply, then add headroom of about thirty percent for growth and fragmentation.

If the working set is two million keys and each entry takes two kilobytes, you need about four gigabytes, and a cache of five or six gigabytes leaves room. A cache much smaller than the working set still helps, but its hit rate falls fast, and the curve is steep near the knee.

![Average latency falls as the cache hit rate rises](/fixtures/hit-rate.svg "Average latency against hit rate. The last few points of hit rate buy the most.")

The shape of that curve explains a common surprise. Going from a ninety percent hit rate to ninety nine percent does not make the average ten percent better. It cuts the number of slow requests by a factor of ten, which cuts the average by far more when misses are a hundred times slower than hits. Late gains in hit rate are the valuable ones.

## What goes wrong

Caches fail in a small number of well known ways. Knowing the names helps you recognize them in a postmortem, and ideally before one.

### The thundering herd

When a popular key expires, many requests miss at the same moment. Each one goes to the database to rebuild the same value. For a key that is expensive to compute, that is a burst of identical heavy queries, and the database may fall over under work whose result would have been the same each time.

There are three common defenses:

1. **Request coalescing.** The first miss takes a lock or registers an in flight request, and the others wait for its result instead of starting their own.
2. **Early refresh.** Rebuild the value shortly before it expires, in the background, so that readers never see a miss.
3. **Serve stale while revalidating.** Return the old value immediately and refresh it in the background. The reader gets a fast answer that is a little old, which is often the right trade.

```python
def get_with_coalescing(key: str, loader, ttl: int):
    value = cache.get(key)
    if value is not None:
        return value

    lock_key = f"lock:{key}"
    if cache.add(lock_key, "1", ttl_seconds=10):
        try:
            value = loader()
            cache.set(key, value, ttl_seconds=ttl)
            return value
        finally:
            cache.delete(lock_key)

    # Someone else is loading. Wait briefly, then read what they stored.
    time.sleep(0.05)
    return cache.get(key) or loader()
```

The sketch above is deliberately small. A production version needs a bounded number of waits and a decision about what to do when the loader fails, but the shape is right: only one caller does the expensive work.

### Cache penetration

Penetration happens when requests ask for keys that do not exist. A miss for a missing key cannot be cached as a normal value, so every such request reaches the database. An attacker, or just a buggy client, can send a stream of random identifiers and bypass the cache completely.

The fixes are to cache the absence itself, with a short TTL, and to put a cheap membership test in front, such as a Bloom filter that says "definitely not present" for most invalid keys. Validate input shapes as early as you can too, since an identifier that is not even the right format never needs a lookup.

### Cache avalanche

An avalanche is the thundering herd at scale: a large share of the cache expires or disappears at once, and the database receives a multiple of its normal load. The causes are a shared TTL without jitter, a cache restart that loses its memory, or a failover to an empty replica.

Defend with jitter, with a warm up step that refills the hot keys before a new node takes traffic, and with a limit on the database side so that overload turns into a few slow requests rather than an outage. A circuit breaker that sheds load when the database slows down is worth the small effort it takes.

### Hot keys

Sometimes one key is so popular that a single cache node cannot serve it. Sharding does not help, because the key still lives on one shard. A celebrity profile or the home page of a sale can reach hundreds of thousands of requests per second for one key.

The remedy is to replicate the hot key. Store several copies under names like `home:1` to `home:8`, and have each reader pick one at random. You can also keep a tiny in process cache in each application server for the hottest keys, so most requests never leave the machine.

## Layers and consistency

Putting a cache in front of a cache sounds wasteful, and it can be, but a small local cache in each server absorbs the hottest reads for almost nothing. The cost is a second layer of staleness. If the local cache keeps entries for ten seconds and the shared cache for five minutes, a reader can see data up to five minutes and ten seconds old.

State the staleness budget at every layer and add them up. If the sum is more than the product can tolerate, shorten the layers closest to the user first, since they are the cheapest to refresh.

### Keeping layers in step

There are three honest ways to keep layers consistent, in rising order of effort.

- **Accept the staleness.** Use short TTLs and live with the bounded delay. This is correct more often than people expect.
- **Invalidate on write.** The write path deletes the entry in each layer it can reach. Local caches in other servers are the hard part, so publish an invalidation message that every server listens to.
- **Version the keys.** Include a version number in the key, such as `user:42:v7`. A write bumps the version, and readers move to the new key without any deletion. Old versions age out by eviction.

Versioned keys are the most robust of the three, because a reader never mixes an old value with a new version. The cost is that you must store the current version somewhere, and that lookup is itself a read to keep fast.

## Measuring a cache

A cache you do not measure is a cache you do not understand. Track a small set of numbers and watch them over time.

- **Hit rate**, split by key family. One global number hides the family that is failing.
- **Latency at the median and the 99th percentile**, for hits and for misses, separately.
- **Eviction rate.** A rising rate means the cache is too small for the working set.
- **Memory use and the number of keys**, to catch growth early.
- **Database load**, because the whole point is to reduce it. A great hit rate with no drop in database load means you are caching the wrong things.

A useful habit is to review these numbers whenever a feature changes what is cached. New code paths change key shapes, sizes, and lifetimes, and the first symptom is usually a quiet fall in the hit rate weeks later.

### A short checklist before shipping

1. State the staleness budget in seconds, and get the owner of the data to agree to it.
2. Choose the write policy and write down why.
3. Add jitter to every TTL.
4. Decide what happens on a miss storm: coalescing, stale serving, or load shedding.
5. Cache absence for lookups that can miss.
6. Make the system work, slowly, when the cache is empty.
7. Add the dashboard before the launch, not after the incident.

## Putting it together

A good cache design starts with a sentence rather than a technology: "readers may see data up to this old, and the system must stay up when the cache is empty." Everything else follows from that sentence. The placement, the policy, the TTLs, the eviction rule, and the defenses against the thundering herd are all ways of keeping that promise at an acceptable cost.

Start with cache aside and short TTLs, since it is simple and fails safely. Measure the hit rate and the database load. Add jitter, coalescing, and negative caching as the traffic shows you need them. Reach for write behind, versioned keys, and layered caches only when a measurement tells you the simple version is not enough.

Finally, remember that the fastest read is the one you never make. Before adding a cache, ask whether the page needs that data at all, whether it could be computed once at write time, and whether the query itself is slower than it needs to be. A cache hides a slow query; it does not fix it, and the hidden cost will return the day the cache is cold.

## Exercises

These questions are meant for practice, and each has a short answer you can check against the text above.

1. A catalog service has two million products, but eighty percent of views go to fifty thousand of them. Each entry is three kilobytes. How much memory does the working set need, including headroom?
2. Your cache uses a five minute TTL with no jitter, and a nightly job warms every key at the same moment. What do you expect to see five minutes later, and what two changes would remove it?
3. A report page is requested with random identifiers by a scanner. Which failure mode is this, and which two defenses apply?
4. Why is deleting a cache entry on write safer than updating it?
5. A hot key receives far more traffic than one node can serve. Describe two ways to spread it.

When you can answer these without looking back, you have the core of the topic. The rest is practice with real traffic, which will teach you the exceptions faster than any article can.
