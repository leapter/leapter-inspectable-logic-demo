# Veritas Built-in Functions & Operations v0.5

Every built-in, plus the cross-blueprint call syntax. For control-flow syntax — `choose`, loops, `decide` decision tables — see `veritas-spec-0.5.md`.

Three rules hold for every built-in. **No built-in converts an argument:** a text where a number belongs, or a number where a text belongs, faults — `floor("2.7")` is not `2`. **An `absent` argument faults** unless the entry below says what it does with one. **A built-in is a function call, never a method:** `upper(name)`, not `name.toUpperCase()` — Veritas has no method calls, and `Math.*`, `.push`, `.length` and the like are refused.

## Lists

Positions start at 0. A list argument that is absent, or that is not a list, faults; `length(absent)` alone answers `0`.

| Signature                         | Returns                                               |
| --------------------------------- | ----------------------------------------------------- |
| `length(list)`                     | how many elements; an absent list gives 0              |
| `first(list)`                      | the first item, or absent when empty                   |
| `last(list)`                       | the last item, or absent when empty                    |
| `append(list, item)`               | new list with item added at the end                    |
| `concatenate(list_a, list_b)`      | new list, the second list after the first              |
| `replace_at(list, position, item)` | new list with item in place of the element at position |
| `sublist(list, start, count?)`     | new list of count items from start; no count takes the rest |
| `reverse(list)`                    | new list in the opposite order                          |
| `sort(list, order?)`               | new list in natural order; `order` is `"ascending"` (the default) or `"descending"` |
| `distinct_values(list)`            | new list, repeats dropped, first of each kept           |
| `contains(list, value)`            | true when an element equals value                       |
| `position_of(list, value)`         | position of the first element equal to value, else -1   |
| `find(list, field, value)`         | first item whose field equals value, else absent        |
| `find_all(list, field, value)`     | new list of every item whose field equals value         |
| `count_where(list, field, value)`  | how many items have that field equal to value           |
| `values_of(list, field)`           | that field from every record, in order                  |
| `join(list, separator)`            | the texts joined with separator between them            |
| `sum(list)`                        | total of the numbers; an empty list gives 0             |
| `max(list, fallback?)`             | largest number, or fallback when there is none          |
| `min(list, fallback?)`             | smallest number, or fallback when there is none         |
| `average(list, fallback?)`         | mean of the numbers, or fallback when there is none     |

`contains`, `position_of`, `find`, `find_all`, `count_where` and `distinct_values` compare with `is`: text is case-sensitive, kinds are never converted (`contains([0], false)` is false), and a record or a list compares by value, field by field. `sum`, `max`, `min` and `average` skip absent elements, and `average` divides by the count of the numbers it read; `max`, `min` and `average` fail on an empty list when no fallback is given. `sort` needs a list of one kind — all numbers, all texts, all dates or all datetimes — and any other `order` than the two words faults. `replace_at` needs a position the list has: past the end, negative or fractional faults, and the list never grows.

**The `-1` trap.** `position_of` answers `-1` on a miss, and `sublist` reads a negative start as counting back from the end, so `sublist(items, position_of(items, x))` on a missing `x` gives the last element. Test the position before using it.

```veritas
//* Field and value, start and count, fallback
rule = find(rules, "role", member.role);
top3 = sublist(sort(scores, "descending"), 0, 3);
meanScore = average(values_of(reviews, "score"), 0);
```

Lists are read with `items[i]` and built with `append(list, item)`. `items[i] = x` writes one position; it is shorthand for `items = replace_at(items, i, x)`. There are no method calls, so `.push`, `.pop`, `.splice`, `.map`, `.filter`, `.reduce`, `.forEach`, `.find`, `.includes`, `.indexOf`, `.join`, `.concat`, `.slice`, `.reverse` and `.length` are all refused — use the built-ins above.

### Records

| Signature                   | Returns                                                   |
| --------------------------- | --------------------------------------------------------- |
| `put(record, field, value)` | new record with field set to value, every other field kept |

`order.total = 100` is shorthand for `order = put(order, "total", 100)`. On a record whose type the blueprint declares, a field the structure does not have is an error when the blueprint is validated.

### Absent values

| Signature                   | Returns                                                   |
| --------------------------- | --------------------------------------------------------- |
| `if_absent(value, fallback)` | the value, or fallback when the value is absent          |

`if_absent` replaces only absence — `0`, `""`, `false` and an empty list pass through. Reach for it whenever a value may be absent, most often a `find` result or an optional input. Both arguments are evaluated first, so a fallback that fails fails the call even when the value is present.

```veritas
//* The rule for this role, or the default when the role has none
matchingRule = if_absent(find(rules, "role", member.role), defaultRule);
```

### Worked example — a result record per loop pass

`current` (an `Employee`) and `bonus` (a `number`) are locals declared at the top of the function body; the loop assigns them.

```veritas
//* Collect one result record per employee
for (index = 0; index < length(employees); index += 1) {
    //* Employee being processed
    current = employees[index];
    //* Proportional bonus for this employee
    bonus = bonusPool * current.rating / 5;
    //* Add the result row
    results = append(results, { name: current.name, bonus: bonus });
}
```

One labeled variable per field before the record literal; more than two or three fields inline is unreadable in the viewer.

## Text

Positions start at 0 and characters are counted as a reader counts them, so `"👍"` is one. Every argument below must be text: an absent one faults, and it is not a blank one — write `trim(if_absent(label, ""))`.

| Signature                        | Returns                                               |
| -------------------------------- | ----------------------------------------------------- |
| `length(text)`                    | how many characters                                    |
| `substring(text, start, length?)` | new text of length characters from start; no length means the rest |
| `upper(text)`                     | every character in upper case                          |
| `lower(text)`                     | every character in lower case                          |
| `trim(text)`                      | white space off both ends, nothing off the middle      |
| `number(text)`                    | the number the digits name; any other spelling is an error |
| `to_text(value, decimals?)`       | the text form of a value; with decimals, exactly that many places |
| `join(list, separator)`           | the texts joined with separator between                |
| `contains(text, part)`            | true when part occurs in the text                      |
| `position_of(text, part)`         | position where part first occurs, else -1              |
| `starts_with(text, part)`         | true when the text begins with part                    |
| `ends_with(text, part)`           | true when the text ends with part                      |

`substring` takes a **length, not an end position** — the same shape as `sublist`, so a text and a list are cut by one rule. `substring(s, 2, 3)` is three characters from position 2. A negative start counts back from the end, a start or length past the end clamps, and a fractional one faults.

`number` reads one spelling and nothing else: an optional sign, digits, an optional decimal point. `number("")`, `number(" 12")`, `number("12a")`, `number("1e5")` and `number("1,5")` all fault. Clean the text where the reader can see it: `number(trim(field))`.

`to_text` with one argument is lossless — `to_text(1.10)` is `"1.1"`, `to_text(true)` is `"true"`, a date is its `"YYYY-MM-DD"` text, a duration its period text, and a datetime its text with the offset it was written in. With `decimals` it rounds ties away from zero and pads: `to_text(1, 2)` is `"1.00"`, `to_text(60000, 2)` is `"60000.00"`. That is the only formatting the language has: no thousands separator, no currency, no date pattern and no locale — how a value is displayed belongs to whoever is reading it, not to the rule. A record or a list has no text form and faults.

**Text and numbers never mix by themselves.** `+` joins two texts; `"Total: " + amount` with a number `amount` faults. Write `"Total: " + to_text(amount, 2)`, and `join` needs texts too: `join([to_text(a), to_text(b)], ", ")`.

```veritas
//* Read an hour out of a fixed-width stamp, and label it
hour = number(substring(departureStamp, 8, 2));
code = upper(trim(countryCode));
label = join([to_text(hour), "00"], ":");
```

`contains` and `position_of` read a list or a text, and the first argument decides which: `contains(["credit decisions"], "credit")` is false, because a list is searched for an element. A search matches the part exactly as written — case-sensitive, no pattern, no wildcard — so a case-insensitive test lowers the text: `contains(lower(label), "credit")`. The empty text occurs in every text, at position 0. A part that is absent or not a text faults.

Case conversion is full and locale-independent: `upper("Grüße")` is `"GRÜSSE"`, six characters from five, and `lower("I")` is `"i"` everywhere. It does not round-trip, so compare two labels case-insensitively by applying **one** of the pair to both sides.

The functions above are the whole text toolkit: there is no split, no replace and no regular expression.

## Math

Numbers are exact decimals, so these answer exactly wherever an exact answer exists: `round(1.005, 2)` is `1.01`. The remainder is `modulo`.

| Signature                | Returns                                        |
| ------------------------ | ---------------------------------------------- |
| `round(value, decimals?)` | value rounded; ties go away from zero          |
| `floor(value)`            | rounded down: `floor(-2.1)` is -3              |
| `ceil(value)`             | rounded up: `ceil(-2.9)` is -2                 |
| `trunc(value)`            | decimals dropped: `trunc(-2.7)` is -2          |
| `abs(value)`              | the value without its sign                     |
| `sign(value)`             | -1, 0 or 1                                     |
| `modulo(a, b)`            | remainder with the sign of b: `modulo(-5, 3)` is 1 |
| `pow(base, exponent)`     | base to the exponent; `pow(9, 0.5)` is 3       |
| `sqrt(value)`             | square root                                    |
| `log(value)`              | natural logarithm, base e                      |
| `log10(value)`            | base-10 logarithm                              |
| `log2(value)`             | base-2 logarithm                               |
| `exp(value)`              | e to the power value                           |

For the larger or smaller of two numbers, `max([a, b])` and `min([a, b])` — the brackets are needed. An argument that is not a number faults, as do `sqrt(-1)`, `log(0)`, `modulo(5, 0)`, `pow(0, -1)` and a result past the number range (about `7.9e28`, which `exp` reaches near 66.5). There is no random function: a blueprint gives the same answer for the same inputs. Nothing else exists yet — no trigonometry, no `hypot`, no `cbrt`.

## Dates

A `date` is a plain calendar day, `"YYYY-MM-DD"`, with no time and no zone. A duration is an ISO-8601 period — `"P1Y"`, `"P30D"`, `"P1M15D"`, `"P2W"` — and one meant for a datetime may carry a time part, `"PT90M"` or `"P1DT12H"`. Write a literal date or duration with its constructor, `date("2026-03-09")` and `duration("P30D")`, never as a bare text in a date or duration position: the constructor refuses any other spelling where it is written, so a typo is reported at the call instead of travelling on. A value already typed `date`, `datetime` or `duration` — an input or a field — needs no constructor. An absent argument faults, except in `is_same_date`, which answers false.

| Signature                   | Returns                                          |
| --------------------------- | ------------------------------------------------ |
| `date(text)`                 | the calendar day the `"YYYY-MM-DD"` text names; any other spelling is an error |
| `duration(text)`             | the duration the period text names; any other spelling is an error |
| `is_before(a, b)`            | true when a falls before b — two dates, or two datetimes compared as instants |
| `is_after(a, b)`             | true when a falls after b — two dates, or two datetimes compared as instants |
| `is_same_date(a, b)`         | true when both are the same day; two datetimes, the same instant |
| `days_between(a, b)`         | whole days from a to b, negative when b is earlier; dates only |
| `add_duration(d, by)`        | d moved forward; a date or a datetime, which keeps its offset |
| `subtract_duration(d, by)`   | d moved backward, under the same rules           |
| `year_of(d)`                 | the calendar year; a date, or a datetime on its own clock |
| `month_of(d)`                | the month, 1 for January through 12              |
| `day_of(d)`                  | the day of the month, 1 to 31                    |
| `weekday_of(d)`              | the day of the week, 1 for Monday through 7 for Sunday |

The second argument of `add_duration` and `subtract_duration` is a `duration` value: `add_duration(d, "P1M")` faults, `add_duration(d, duration("P1M"))` works. Months are added as calendar months and clamp to the month end — January 31 plus one month is February 28, or 29 in a leap year — then days are added. A duration with a time part fails against a date. There is no `today` and no `now`: a rule about the current day takes it as an input, `asOf`.

```veritas
//* A quote honored for 30 days, still valid on the day asked about
expiry = add_duration(issuedOn, duration("P30D"));
valid = not is_after(asOf, expiry);
```

### Datetimes

A datetime's parts read the clock it was written on, never UTC; read UTC with `utc_of`, as in `hour_of(utc_of(dt))`. To compare two datetimes, test the sign of `seconds_between`.

| Signature                   | Returns                                          |
| --------------------------- | ------------------------------------------------ |
| `hour_of(dt)`                | the hour, 0 to 23                                |
| `minute_of(dt)`              | the minute, 0 to 59                              |
| `second_of(dt)`              | the second, with its fraction                    |
| `to_date(dt)`                | the date on its own clock                        |
| `seconds_between(a, b)`      | seconds from a to b, signed, with the fraction   |
| `utc_of(dt)`                 | the same instant, written at `Z`                 |
| `offset_of(dt)`              | the offset as a duration: `+02:00` is `PT2H`     |
| `at_offset(dt, offset)`      | the same instant, written at an offset duration  |

```veritas
//* At least eleven hours of rest between two shifts
rested = seconds_between(previousEnd, nextStart) >= 11 * 3600;
```

## Blueprint Calls

A project is a set of blueprints that call each other; this is the unit of reuse. A call is a function call with named arguments, and it is a whole statement: the call is the entire right-hand side of an assignment.

```
resultVar = callIdentifier(paramName: expression, ...);
```

- **A call never sits inside a larger expression.** `total = base + calculate_tax(amount: subtotal).tax;` and `rate = zone_rate_lookup(zone: zone).ratePerKg;` are refused. Bind the result first, then read the field in the next step.
- **Named arguments only** — `paramName: value`, naming an input parameter of the called blueprint. Positional arguments are for built-ins. Every required input of the called blueprint must be supplied, and an argument it does not declare is an error; an optional input (`name?:`) may be left out and is `absent` there.
- **The call name is the blueprint's `callIdentifier`, not its label**: the label lowercased, with every run of non-alphanumeric characters replaced by `_`. `"Zone Rate Lookup"` becomes `zone_rate_lookup`.
  Apply the rule to the helper's `//*` label, and declare the helper with that same name.
- The result is the called blueprint's **whole output record**, not one field — even when it has one output. Declare the local that holds it `any single` at the top of the function body, and read fields off it.
- Arguments are passed by value: nothing the called blueprint does changes the caller's values. A failure it throws unwinds into the caller, where a `catch` on an enclosing section can take it.

### Worked example — calling a helper

The helper is a complete blueprint of its own, runnable on its own and callable from any other blueprint in the project:

```veritas
//* Zone Rate Lookup
"""Looks up the shipping rate per kilogram for a destination zone. Zone codes come from the carrier's contract; a zone not in the contract ships at the international rate."""
function zone_rate_lookup {

  inputs {
    //* Destination zone code
    zone: _text
  }

  outputs {
    //* Rate per kilogram in euros
    ratePerKg: number
  }

  //* Rate for the zone
  decide first

  | zone | -> ratePerKg |
  | ---  | ---          |
  | "DE" | 1.2          |
  | "EU" | 2.5          |
  | any  | 6            |
  //* Return
  return;
}
```

> Input `{"zone": "EU"}` → Output `{"ratePerKg": 2.5}`

The entry blueprint calls it, binds the whole result, and reads the field in its own step:

```veritas
//* Calculate Shipping Fee
"""Prices the shipping of a parcel for checkout: the destination zone's rate per kilogram times the parcel weight."""
public function calculate_shipping_fee {

  inputs {
    //* Destination zone code
    zone: _text
    //* Parcel weight in kilograms
    weightKg: number
  }

  outputs {
    //* Shipping fee in euros
    fee: number
  }

  locals {
    //* The helper's result for this zone
    zoneRate: any single
  }

  //* Ask the helper blueprint for the zone's rate
  zoneRate = zone_rate_lookup(zone: zone);
  //* Weight times the zone rate
  fee = weightKg * zoneRate.ratePerKg;
  //* Return
  return;
}
```

> Input `{"zone": "DE", "weightKg": 3}` → Output `{"fee": 3.6}`

The helper `zone_rate_lookup` is a complete blueprint of its own, runnable on its own and callable from any other blueprint in the project. It is private: it carries no `public` modifier, so it is not an endpoint. `calculate_shipping_fee` is the entry blueprint the caller invokes through the API, so it is declared `public function`.
