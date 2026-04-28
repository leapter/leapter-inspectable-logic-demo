# Insurance Premium Calculation

Every motor insurance policy starts with a premium quote. The customer
provides details about their vehicle, driving history, and desired coverage
level. The system computes a fair premium that reflects the actual risk
while remaining competitive. This logic powers the instant quote form
on the customer-facing web application.

## The Idea

The premium is built up in layers: a base rate determined by the vehicle's
risk profile, adjustments for the driver's experience and record, and a
final scaling based on the chosen coverage tier and deductible.

**Inputs:**

- **vehicleType** (string): The type of vehicle — one of "car", "truck", "suv", or "motorcycle".
- **year** (number): The model year of the vehicle (1990–2026).
- **mileage** (number): Estimated annual mileage in miles.
- **driverAge** (number): Age of the primary driver in years (18–100).
- **yearsLicensed** (number): Number of years the driver has held a valid license.
- **cleanRecord** (boolean): Whether the driver has had no accidents or violations in the past 3 years.
- **coverageLevel** (string): The coverage tier — one of "liability", "standard", or "comprehensive".
- **deductible** (number): The chosen deductible amount in USD (250–5000).

**Outputs:**

- **monthlyPremium** (number): The monthly premium amount in USD, rounded to two decimal places.
- **annualPremium** (number): The annual premium amount in USD, rounded to two decimal places.
- **baseRate** (number): The base monthly rate before adjustments, for transparency.
- **riskFactor** (number): The combined risk multiplier applied, rounded to two decimal places.

## The Algorithm

The premium flows through four stages: establish the base rate from the
vehicle, assess the driver's risk profile, apply the coverage and
deductible scaling, and compute the final monthly and annual amounts.

### Step 1. Determine base rate from vehicle type

Different vehicle types carry fundamentally different risk profiles based
on accident statistics and average repair costs. The base monthly rate is:

| Vehicle Type | Base Rate (USD/month) |
|---|---|
| car | 120.00 |
| suv | 145.00 |
| truck | 155.00 |
| motorcycle | 180.00 |

Motorcycles are the most expensive to insure due to the higher injury
severity in accidents. Trucks carry higher liability due to their mass.

### Step 2. Apply vehicle age and mileage adjustments

Older vehicles and higher mileage both increase risk. We compute a vehicle
risk factor that multiplies the base rate.

**Vehicle age factor:** Vehicles older than 10 years (model year before 2016)
receive a 15% surcharge (factor 1.15). Vehicles 5–10 years old (2016–2021)
receive a 5% surcharge (factor 1.05). Newer vehicles (2022 or later) receive
no surcharge (factor 1.00).

**Mileage factor:** Annual mileage above 15,000 miles adds a 10% surcharge
(factor 1.10). Mileage above 25,000 miles adds a 20% surcharge (factor 1.20).
Mileage at or below 15,000 miles carries no surcharge (factor 1.00).

The vehicle adjustment is the product of both factors, applied to the base rate.

### Step 3. Assess driver risk profile

The driver's personal risk profile adjusts the premium further. Three
factors contribute:

**Young driver surcharge:** Drivers under 25 carry statistically higher
accident rates. They receive a 30% surcharge (factor 1.30). Drivers 25
and older receive no surcharge (factor 1.00).

**Experience discount:** Drivers with 5 or more years of licensed driving
receive a 10% discount (factor 0.90). Drivers with 10 or more years receive
a 15% discount (factor 0.85). Less than 5 years of experience carries no
discount (factor 1.00).

**Clean record discount:** A clean driving record (no accidents or violations
in 3 years) earns a 15% discount (factor 0.85). A non-clean record carries
no discount (factor 1.00).

The driver risk factor is the product of all three sub-factors.

### Step 4. Apply coverage tier and deductible

The coverage tier scales the premium to reflect the breadth of protection:

| Coverage Level | Multiplier |
|---|---|
| liability | 0.60 |
| standard | 1.00 |
| comprehensive | 1.45 |

Liability-only is the cheapest option — it covers damage to others but not
the policyholder's own vehicle. Comprehensive covers everything including
theft, weather, and vandalism.

**Deductible adjustment:** A higher deductible reduces the insurer's
expected payout. For every 500 USD of deductible above the minimum (250),
the premium decreases by 3%. The formula: deductible factor =
1.0 − ((deductible − 250) / 500) × 0.03. This is capped at a minimum
factor of 0.85 (at deductible = 5000).

### Step 5. Compute final premium

The monthly premium is: baseRate × vehicleAgeFactor × mileageFactor ×
youngDriverFactor × experienceFactor × cleanRecordFactor × coverageTierMultiplier
× deductibleFactor.

Round the result to two decimal places. The annual premium is simply
monthlyPremium × 12.

The riskFactor output is the product of all adjustment factors (excluding
the coverage tier multiplier and deductible factor), so the customer can
see how their personal risk profile affects pricing.

## Scenarios

### Young motorcycle rider, full coverage

A 21-year-old with 2 years of driving experience and a clean record wants
comprehensive coverage on a motorcycle with a low deductible. This is the
most expensive profile.

**Given:**

- `vehicleType`: "motorcycle"
- `year`: 2023
- `mileage`: 8000
- `driverAge`: 21
- `yearsLicensed`: 2
- `cleanRecord`: true
- `coverageLevel`: "comprehensive"
- `deductible`: 500

**Expect:**

- `monthlyPremium`: 244.04
- `annualPremium`: 2928.43
- `baseRate`: 180.00
- `riskFactor`: 1.11

### Experienced driver, liability only

A 45-year-old with 20 years of experience and a clean record insures a
2020 SUV with liability-only coverage and a high deductible. This is a
low-cost profile.

**Given:**

- `vehicleType`: "suv"
- `year`: 2020
- `mileage`: 12000
- `driverAge`: 45
- `yearsLicensed`: 20
- `cleanRecord`: true
- `coverageLevel`: "liability"
- `deductible`: 2500

**Expect:**

- `monthlyPremium`: 52.69
- `annualPremium`: 632.26
- `baseRate`: 145.00
- `riskFactor`: 0.76

### High mileage truck, standard coverage

A 30-year-old truck driver with 8 years of experience but a recent
accident. Drives 30,000 miles per year in a 2018 truck with the default
deductible.

**Given:**

- `vehicleType`: "truck"
- `year`: 2018
- `mileage`: 30000
- `driverAge`: 30
- `yearsLicensed`: 8
- `cleanRecord`: false
- `coverageLevel`: "standard"
- `deductible`: 1000

**Expect:**

- `monthlyPremium`: 166.73
- `annualPremium`: 2000.74
- `baseRate`: 155.00
- `riskFactor`: 1.13

### Minimum deductible, new car

A 35-year-old with 15 years of experience and a clean record insures a
brand-new car with standard coverage and the minimum deductible. This is
the baseline "average customer" profile.

**Given:**

- `vehicleType`: "car"
- `year`: 2026
- `mileage`: 10000
- `driverAge`: 35
- `yearsLicensed`: 15
- `cleanRecord`: true
- `coverageLevel`: "standard"
- `deductible`: 250

**Expect:**

- `monthlyPremium`: 86.70
- `annualPremium`: 1040.40
- `baseRate`: 120.00
- `riskFactor`: 0.72

## Remarks

- All monetary amounts are in USD and rounded to two decimal places.
- The deductible factor formula ensures a smooth, predictable discount
  curve rather than discrete tiers.
- The riskFactor output excludes coverage and deductible adjustments —
  it reflects only the vehicle and driver profile, so it can be displayed
  as "Your risk score" in the UI.
- The order of factor application is commutative (all multiplicative),
  but the step order reflects the conceptual flow: vehicle → driver →
  coverage → final.
