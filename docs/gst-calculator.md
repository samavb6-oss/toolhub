# ToolHub GST Calculator

The GST Calculator is available at `/tools/gst-calculator` and is discoverable through ToolHub's tool registry and Finance category.

## Features

- Add GST to a pre-tax amount or extract GST from an inclusive total.
- Choose intra-state (CGST + SGST/UTGST) or inter-state (IGST) treatment.
- Validate amounts and rates; reject unsafe calculations.
- Display INR amounts to two decimal places and preserve inclusive totals exactly.
- Calculation is performed in the browser; no amount is uploaded.

## Rounding and scope

Amounts are normalized to paise. GST on exclusive amounts is rounded to the nearest paise, with positive half-paise values rounded upward. Inclusive amounts use a rounded base amount and define GST as the difference from the entered total. For intra-state supplies, an odd paise is assigned to SGST/UTGST so the components sum to the total GST.

This is an arithmetic estimator, not a compliance or classification engine. It does not determine the applicable rate, HSN/SAC classification, exemptions, cess, reverse charge, or place of supply. Confirm the applicable rate and treatment against current official guidance before using results for invoicing.

## Official references

- CBIC Integrated GST Act, 2017: https://cbic-gst.gov.in/hindi/IGST-bill-e.html
- CBIC GST goods and services rate schedules: https://cbic-gst.gov.in/hindi/gst-goods-services-rates.html
- CBIC Central GST Act, 2017: https://cbic-gst.gov.in/hindi/CGST-bill-e.html

## Tests

Run the GST logic tests with `node --experimental-strip-types --test tests/gstCalculatorLogic.test.ts`. The test suite covers inclusive/exclusive calculations, 5/12/18/28% rates, inter/intra-state splits, paise rounding, boundary rates, invalid input, and unsafe intermediate arithmetic.
