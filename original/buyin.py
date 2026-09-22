"""What "the cheapest unidentified" should mean, given the bottom of the book.

THE PROBLEM WITH result[0]

The cheapest listing is not a price you can rely on. Among the ten cheapest of
almost any unidentified base there are usually a couple of strays: items already
sold but not yet delisted, price-fixing bait, and typos. Pricing a gamble off
the single cheapest listing means one of those sets the buy-in for the whole
model. That is not hypothetical- the Watcher's Eye ilvl 87 buy-in was recorded
at 200c from one listing while the market sat at 423c, which made it look like
the best gamble on the sheet by three times, for two days.

THE RULE

Take the TEN cheapest, then:

    buy-in (drives EV)  = MEDIAN of the ten
    floor (best price)  = cheapest quote that is not a stray
    stray               = a quote below STRAY_FRACTION x median

The median drives the EV because these are REPEATED gambles. Profit per click is
an average over many clicks, and you cannot buy a hundred items at the single
cheapest listing - you walk up the book. This is the same argument the Breach
tab already makes when it prices sixty rings at the sixtieth-cheapest rather
than the first.

The floor is reported beside it because it is the actionable number when you
only want one item, and because the GAP between floor and median is itself the
signal: when they are close the market is tight and both are trustworthy; when
they are far apart the bottom of the book is noise.

WHY HALF THE MEDIAN

A listing among the ten cheapest that is under half the market median is almost
never a buyable price. Set the threshold tighter and genuine bargains get thrown
away; looser and bait survives. Half is the point where, on this market, the
discarded quotes were all sold-or-bait on inspection. It is a judgement, not a
law, which is why the count of discarded quotes travels with the answer instead
of being swallowed.

WHEN THE MEASUREMENT SHOULD NOT BE TRUSTED

Three or more strays out of ten means the bottom of the book is mostly noise, or
the market is genuinely bimodal (two different items sharing one search). Either
way the buy-in is not a reliable single number, so `reliable` goes false and the
caller should say so rather than quietly publishing it.

TEN QUOTES IS NOT ALWAYS A SAMPLE

The rule defends against a FEW bad listings. It cannot defend against ten. On a
book 868 listings deep, the ten cheapest are the bottom 1.2% - and if a seller
bulk-lists ten at one price, or ten pieces of bait share a round number, the
median of ten IS that price and every stray check passes, because nothing is
anomalous relative to its neighbours when the neighbours are the problem.

That is not hypothetical either. On 11 Aug 2026 the unidentified Forbidden Flesh
buy-in came back as 182.61c - exactly 0.9 divine - with floor EQUAL to median,
from a book of 868 listings, 32 hours after the same measurement returned 1,875c
from a book of 1,019. A flat wall at a round number is the signature. Taken at
face value it turned a -193c per click loss into a +1,499c profit, an 820%
return sitting unclaimed in a liquid market.

So `assess` takes the total listing count when the caller knows it, and reports
`sampled_share`. Two things it now refuses to call reliable:

    a FLAT sample (floor == median, zero spread) drawn from a book so deep that
    the sample cannot be representative - the wall signature above; and

    any sample that is a negligible slice of a very deep book, which is a
    statement about what ten quotes can support, not about the quotes.

A deep book is EASIER to price, not harder- but only if you look deeper into it.
Ten is the right depth for the thin books this started with, not for a thousand.
"""

from __future__ import annotations

import statistics as st

STRAY_FRACTION = 0.5      # below this share of the median, a quote is a stray
MAX_STRAYS = 2            # more than this and the measurement is not reliable
WANT = 10                 # how deep into the book to look


DEEP_BOOK = 200          # listings past which ten quotes stop being a sample
WALL_SHARE = 0.05        # a flat sample from under this share of a book is a wall


def apply_depth(*, n: int, kept: int, strays: int, spread: float,
                listings: int | None, reliable: bool, note: str,
                buyable_only: bool = False) -> tuple[bool, str, float | None]:
    """Judge a sample against the book it came from.

    `buyable_only` says every listing in the book was instant-buyout (the trade
    API's `securable` status). That inverts the meaning of a FLAT sample, so it
    has to be passed in rather than inferred:

        under `status: any` the book contains offline sellers and dead
        listings, so ten quotes at one price are most likely one bulk lister or
        a bait cluster nobody can actually buy from - a wall; but

        under `securable` every quote is a price someone will actually sell at,
        so ten of them agreeing is CONSENSUS, and the strongest evidence the
        book can offer. `base_prices_ilvl86.py` records exactly this: the ten
        cheapest securable Precision eyes were "2.000 divine, all ten
        identical", against 0.288 divine for the cheapest `any` ask - a 7x
        error, and the flat result was the correct one.

    Split out from `assess` so a stored assessment can be re-judged later
    without the original quotes: it needs only counts, which every artifact
    already keeps. That matters because the depth check arrived after buy-ins
    had already been collected and cached without it.
    """
    if not isinstance(listings, int) or listings <= 0 or n <= 0:
        return reliable, note, None
    sampled_share = n / listings
    if listings <= DEEP_BOOK:
        return reliable, note, sampled_share
    if spread <= 1e-9 and buyable_only:
        return reliable, (
            f"{kept} independent buyable quotes agree on one price out of "
            f"{listings:,} listings- consensus, the strongest signal a book "
            f"gives"
        ), sampled_share
    if spread <= 1e-9:
        return False, (
            f"WALL: all {kept} retained quotes sit at one price out of "
            f"{listings:,} listings ({sampled_share:.1%} sampled), and the "
            f"search did not require instant buyout- so these may be dead or "
            f"offline listings nobody can buy. Re-measure with status=securable "
            f"before pricing against it"
        ), sampled_share
    if sampled_share < WALL_SHARE and not strays:
        return reliable, (
            f"{note}; only {sampled_share:.1%} of a {listings:,}-listing book "
            f"was sampled, so this is the bottom of the book rather than its price"
        ), sampled_share
    return reliable, note, sampled_share


def assess(quotes: list[float], listings: int | None = None,
           buyable_only: bool = False) -> dict:
    """Turn the cheapest listings into a buy-in, a floor, and a verdict.

    `quotes` are prices in one currency, any order. `listings` is the TOTAL size
    of the book those quotes were drawn from, when the caller knows it; without
    it the depth checks cannot run and are skipped rather than guessed.
    `buyable_only` says the search required instant buyout (`securable`), which
    is what separates ten sellers agreeing from ten listings nobody can buy.
    Returns None values rather than guessing when there is nothing to work with.
    """
    q = sorted(float(x) for x in quotes if x is not None)[:WANT]
    if not q:
        return {"buyin": None, "floor": None, "cheapest": None, "n": 0,
                "strays": 0, "reliable": False,
                "note": "no listings- not priced, which is not the same as free"}

    # Two medians, deliberately. The FIRST one only sets the stray threshold;
    # the buy-in is the median of what SURVIVES that cut. Returning the first
    # one would defeat the discard entirely - the strays are still sitting in
    # the sample dragging it down, which is the exact effect removing them was
    # meant to undo. On [1, 2, 60, 70, 80, 90, 100, 110, 120, 130] the cut
    # median is 85 and the buy-in is 95; publishing 85 understates the market
    # by the pull of two listings already judged to be sold, bait or mistyped.
    #
    # The cut is not recomputed after the discard. One pass matches the stated
    # rule ("strays are under half the median") and cannot iterate its way down
    # the book, where each removal lifts the median and so qualifies the next
    # cheapest quote as the new stray.
    cut_median = st.median(q)
    cut = cut_median * STRAY_FRACTION
    strays = [x for x in q if x < cut]
    kept = [x for x in q if x >= cut]
    floor = kept[0] if kept else q[0]
    median = st.median(kept) if kept else cut_median

    # How far the floor sits below the median says whether the bottom of the
    # book is one price or a slope. "No strays" is NOT the same as "tight": a
    # book running 1,301 to 2,100 has no stray under half the median and is
    # still a 38% spread, and calling that tight would invite trusting the
    # floor as if it were the market.
    spread = 1 - (floor / median) if median else 0
    reliable = len(strays) <= MAX_STRAYS and len(q) >= 3
    if len(q) < 3:
        note = f"only {len(q)} listing(s)- thin market, treat as indicative"
    elif not strays and spread <= 0.15:
        note = "tight book, floor and median agree"
    elif not strays:
        note = (f"no strays, but the floor is {spread:.0%} under the median- "
                f"thin at the bottom, so the floor is one listing not a market")
    elif not reliable:
        note = (f"{len(strays)} of {len(q)} below half the median- the bottom of "
                f"the book is noise, or two different items share this search")
    else:
        note = (f"{len(strays)} stray listing(s) under {cut:,.0f} discarded "
                f"(sold, bait or mistyped)")

    # DEPTH. Everything above reasons about the ten quotes; this reasons about
    # what the ten quotes can represent.
    reliable, note, sampled_share = apply_depth(
        n=len(q), kept=len(kept), strays=len(strays), spread=spread,
        listings=listings, reliable=reliable, note=note,
        buyable_only=buyable_only,
    )

    return {"buyin": round(median, 2),      # what EV should be computed against
            "floor": round(floor, 2),       # best price you could actually take
            "cheapest": round(q[0], 2),     # raw, kept so the gap is visible
            "n": len(q), "strays": len(strays), "reliable": reliable,
            "spread": round(spread, 3),
            "listings": listings,
            "sampled_share": round(sampled_share, 5) if sampled_share is not None else None,
            "note": note}


def describe(a: dict, unit: str = "c") -> str:
    """One line for a console or a sheet caption."""
    if a["buyin"] is None:
        return a["note"]
    gap = ("" if a["floor"] == a["cheapest"]
           else f" (raw cheapest {a['cheapest']:,.0f}{unit} discarded)")
    return (f"buy-in {a['buyin']:,.0f}{unit} median-of-{a['n']}, "
            f"floor {a['floor']:,.0f}{unit}{gap} - {a['note']}")


def quotes_from(entries, rates) -> list[float]:
    """Chaos-equivalent prices out of a trade `fetch` response.

    Every collector was converting listing prices to chaos with its own copy of
    the same four lines, which is how they also each ended up with their own
    idea of what "cheapest" meant.
    """
    out = []
    for e in entries or []:
        p = ((e or {}).get("listing") or {}).get("price") or {}
        amount, currency = p.get("amount"), p.get("currency")
        rate = rates.get(str(currency)) if currency else None
        if (isinstance(amount, (int, float)) and isinstance(rate, (int, float))
                and amount > 0 and rate > 0):
            out.append(float(amount) * float(rate))
    return out
