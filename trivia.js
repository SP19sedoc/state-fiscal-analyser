// Rotating "did you know" facts shown during the analyze step, which is the
// longest part of the pipeline (an LLM call over a long document). Purely to
// keep the wait from feeling dead — ticks independently of real progress.
// Facts are state-specific figures drawn from each state's CAG State Finances
// Audit Report and 16th Finance Commission evaluation report (see
// data/reference/ and trivia-repository.xlsx for provenance).

const TRIVIA_FACTS = [
  "Andhra Pradesh's capital expenditure fell to a five-year low of just 0.55% of GSDP in 2022-23, with the state spending only 3.45% of total expenditure on capital account versus a general-states average of 13.48%.",
  "Andhra Pradesh's off-budget borrowings through PSUs and parastatals stood at ₹1,28,048 crore as of 31 March 2023, requiring an additional ₹15,499 crore in state grants-in-aid that year just for their repayment and servicing.",
  "Andhra Pradesh's subsidy spending rose nearly tenfold, from ₹2,352 crore (1.83% of revenue expenditure) in 2018-19 to ₹23,004 crore (11.43%) in 2022-23.",
  "In the pandemic year 2020-21, Andhra Pradesh's GSDP grew 1.5%, making it one of only three states (with Assam at 3.0% and Tamil Nadu near zero) that avoided a contraction.",
  "Arunachal Pradesh failed to transfer ₹58 crore in employees' National Pension System contributions to NSDL, leaving the money sitting in state savings, current, and public accounts instead.",
  "₹365.29 crore was locked up in 83 incomplete capital projects in Arunachal Pradesh in 2023-24, and the state had no comprehensive database tracking their costs or status.",
  "Arunachal Pradesh's debt-to-GSDP ratio jumped 5.10 percentage points in a single year to reach 39.48% in 2023-24.",
  "Arunachal Pradesh's own revenue could finance only 10.81% of its total expenditure in 2021-22, with Central transfers covering 88.63% of the state's aggregate revenue that year.",
  "Assam's off-budget borrowings through state PSUs and parastatals totaled ₹2,193.13 crore as of 31 March 2024, with ₹1,101.89 crore raised in 2023-24 alone and ₹129.36 crore paid in interest that year.",
  "Nearly 39% of Assam's receipts (38.96%) and disbursements (38.07%) booked by the Accountant General in 2023-24 had still not been reconciled by the departments that generated them.",
  "Assam added ₹30,210.86 crore in supplementary grants in 2023-24 that proved entirely unnecessary, since actual gross expenditure of ₹1,39,449.66 crore fell short of even the original budget provision of ₹1,39,755.27 crore.",
  "Power subsidies made up 42.14% of all subsidies Assam paid out over five years, even as total subsidy spending fell from ₹1,473.23 crore in 2019-20 to ₹455.78 crore in 2023-24.",
  "Bihar posted a revenue surplus of ₹2,833.06 crore in 2023-24, its first since 2018-19, even as its fiscal deficit widened to 4.17% of GSDP that year.",
  "Power subsidies accounted for 72.92% to 82.77% of Bihar's total subsidies each year from 2019-20 to 2023-24, as overall subsidy spending more than doubled from ₹7,121.27 crore to ₹16,244.61 crore.",
  "As of 31 March 2024, 49,649 utilisation certificates worth ₹70,877.61 crore remained outstanding in Bihar, which auditors said carried a risk of embezzlement and misappropriation.",
  "Bihar's per capita income of ₹66,828 in 2023-24 was far below neighboring Jharkhand (₹1,15,960), West Bengal (₹1,71,184) and Uttar Pradesh (₹1,07,468).",
  "In Chhattisgarh, 52% of the ₹67,412.52 crore borrowed in 2023-24 went straight to repaying earlier debt (₹34,929.59 crore), leaving less than half for actual development spending.",
  "Chhattisgarh's fiscal deficit hit 5.32% of GSDP in 2023-24, well above its own FRBM ceiling of 2.99%.",
  "Chhattisgarh had 130 Personal Deposit accounts holding a combined ₹1,352.90 crore outside the Consolidated Fund of the State as of 31 March 2024.",
  "Chhattisgarh's debt-to-GSDP ratio nearly tripled from 10.85% in 2012-13, well under the 25% FRBM limit, to a pandemic-driven peak of 26.30% in 2020-21.",
  "Delhi's 2023-24 revenue surplus of ₹6,462 crore only existed because the Union Government bore ₹2,023 crore in pensionary liabilities and ₹11,123 crore in Delhi Police expenditure; without those, Delhi would have posted a revenue deficit of ₹6,684 crore.",
  "Power subsidies made up as much as 70.39% of Delhi's total subsidy spending in 2020-21, as overall subsidies grew from ₹3,593 crore in 2019-20 to ₹4,840 crore in 2023-24.",
  "Delhi's capital expenditure stayed below 1% of GSDP in every year from 2019-20 to 2023-24, and it fell a further 15% in 2023-24, with medical and public health spending down 49.87% and education spending down 42.19%.",
  "Delhi had 1,313 outstanding utilisation certificates worth ₹3,760.84 crore pending as of 31 March 2024, alongside 4,466 unsubmitted Detailed Contingent bills worth ₹346.82 crore against money already drawn.",
  "Goa carried an off-budget borrowing liability of ₹706 crore in 2023-24 that isn't reflected in its headline debt figures — including it pushes total outstanding debt from ₹32,867 crore to ₹33,573 crore and raises the debt-to-GSDP ratio from 29.27% to 29.93%.",
  "Goa's debt-to-GSDP ratio breached its own 25% statutory ceiling in all five years from 2019-24, ranging as high as 34.63%.",
  "Goa has ₹12,625.06 crore of excess expenditure from 2008-09 to 2022-23 still pending regularisation by the state legislature under Article 205 of the Constitution.",
  "12,813 utilisation certificates worth ₹3,027.52 crore, covering grants-in-aid to 31 departments, remained unsubmitted in Goa as of 31 March 2024.",
  "Tariff subsidies paid to Gujarat's power sector companies grew at a CAGR of 25.18% (from ₹1,109 crore in 2012-13 to ₹10,478 crore in 2022-23), dwarfing the ₹1,432 crore combined profit those same companies posted in 2022-23.",
  "Gujarat's debt-service ratio (public debt principal and interest due against revenue receipts) stood at 25.08% in FY2024-25, at the World Bank's flagged fiscal-vulnerability watch threshold.",
  "Gujarat's own tax revenue-to-GSDP ratio declined from 7.44% in 2012-13 to 5.60% in 2022-23, even as GST-era tax buoyancy improved from 0.39 pre-GST to 1.08 post-GST.",
  "Gujarat's urban local bodies saw their own revenue grow just 4% over the study period even as their total expenditure grew 10% and revenue expenditure rose almost 11%, squeezing their finances.",
  "In 2023-24, Haryana's capital expenditure of ₹15,921 crore amounted to just 18% of the state's total borrowings, indicating borrowed funds went mainly toward current consumption and debt repayment rather than asset creation.",
  "Haryana's subsidy bill reached ₹10,718 crore in 2023-24, with power subsidies alone accounting for 74.15% (₹7,947 crore) of the total.",
  "User fees in Haryana covered only about 7% of the cost of providing social services and 9% of economic services on average, according to the 16th Finance Commission evaluation.",
  "Haryana's share of total central grants fell from 2.16% in 2009-10 to just 1.19% in 2023-24.",
  "Himachal Pradesh's debt-to-GSDP ratio climbed from 39.09% in 2019-20 to 43.98% in 2023-24, well above its own FRBM target of 38.98%.",
  "Between 52.99% and 74.11% of Himachal Pradesh's public debt receipts during 2019-2024 went straight to repaying existing borrowings rather than funding new spending.",
  "Himachal Pradesh's per-capita GSDP, once 44.90% above the national per-capita GDP average in 2019-20, saw that lead shrink to just 30.80% by 2023-24.",
  "Tourism accounts for about 7.0% of Himachal Pradesh's GDP and roughly 14.42% of direct and indirect employment in the state.",
  "Grants-in-Aid from the Government of India (₹42,690.77 crore) made up 72.07% of Jammu and Kashmir's total revenue receipts of ₹59,238.50 crore in 2021-22.",
  "Off-budget borrowings by two J&K power/infrastructure corporations (₹10,321.83 crore by JKPCL and ₹2,122.77 crore by JKIDFC) would push J&K's liabilities-to-GSDP ratio from a reported 11.99% up to 18.37% if counted.",
  "The Jammu and Kashmir government had to draw an RBI overdraft on 178 days during 2021-22, in addition to relying on Ways and Means Advances on a further 125 days.",
  "J&K's Road Transport Corporation was handed a fresh ₹40 crore loan in 2021-22 despite already owing ₹439.23 crore and having booked ₹117.62 crore in losses in its last audited accounts (2018-19).",
  "47,367 utilisation certificates worth ₹1,33,161.50 crore were pending in Jharkhand as of 31 March 2024, a backlog the CAG flagged as a fraud and misappropriation risk.",
  "Jharkhand's debt-to-GSDP ratio fell to a five-year low of 27.68% in 2023-24, down from a peak of 36.23% in 2020-21.",
  "Jharkhand is the only state in India that produces both coking coal and uranium.",
  "Supplementary budget provisions of ₹13,499.10 crore across 57 cases in Jharkhand proved entirely unnecessary in 2023-24, since actual spending never reached the original provisions.",
  "Karnataka's five state \"guarantee\" welfare schemes cost ₹52,525.60 crore in 2024-25 (19% of revenue expenditure), a burden that tipped the state from revenue surplus into revenue deficit starting in 2023-24.",
  "Karnataka's own-tax revenue buoyancy (growth in own tax revenue relative to GSDP growth) fell to just 0.75 in 2024-25, down from a range of 1.15 to 1.23 in the previous three years.",
  "Despite ₹19,000 crore in capital spending on irrigation in 2024-25, 1,903 irrigation works in Karnataka remained incomplete.",
  "Trend-based projections in the 16th Finance Commission study suggest Karnataka is likely to breach its prescribed debt-to-GSDP limit of 25.2% sometime between 2026-27 and 2030-31.",
  "Kerala's revenue deficit nearly doubled in a single year, rising from ₹9,226.28 crore in 2022-23 to ₹18,140.19 crore in 2023-24, a 96.61% jump.",
  "Kerala spent just ₹13,584.45 crore on capital account in 2023-24 — only 5.18% of its total borrowings — meaning most borrowed money funded current consumption rather than asset creation.",
  "Off-budget borrowings of ₹10,632.46 crore raised through Kerala's public sector undertakings in 2023-24 push the state's real liabilities to 37.84% of GSDP, above the reported on-book debt ratio of 34.96%.",
  "Four Kerala public enterprises (KSRTC, Kerala Water Authority, KSSPL, and KSEB Ltd) accounted for 86% of the total net losses among the state's 131 active public enterprises in 2022-23.",
  "Madhya Pradesh surrendered ₹23,696.42 crore of unspent budget on the very last day of the 2023-24 financial year, out of ₹67,926.15 crore in total savings against the budget.",
  "Madhya Pradesh's 730 Personal Deposit Accounts had a combined negative closing balance of ₹917.24 crore as of 31 March 2024, with 214 of those accounts (₹325.86 crore) dormant for more than three years.",
  "Only six Indian states (Bihar, Uttar Pradesh, Jharkhand, Manipur, Assam, and Meghalaya) had a lower per capita income than Madhya Pradesh in 2022-23.",
  "Under the UDAY scheme, Madhya Pradesh committed to absorb ₹26,055 crore of DISCOM debt but ultimately took on only ₹12,690 crore, while 2022-23 power distribution operational losses stood at 51.92% of expenditure, far above the national average of 31.02%.",
  "Maharashtra did not achieve a revenue surplus in any of the five years from 2019-20 to 2023-24, with the deficit widening from ₹1,936.47 crore in 2022-23 to ₹13,754 crore in 2023-24.",
  "Maharashtra ran a primary deficit in every year from 2019-20 to 2023-24, reaching ₹44,907.45 crore in 2023-24, meaning even non-interest spending had to be funded by fresh borrowing.",
  "Maharashtra's per capita income was 78% higher than the national average even though 43% of its workers were still dependent on agriculture in 2022-23, while services contributed 60% of the state's gross value added.",
  "In 2019-20, anaemia affected 68.9% of Maharashtra children aged 6-59 months, and 36% of children under five were underweight.",
  "Manipur's own tax revenue, over 75% of which comes from SGST, contracted 28.87% in 2023-24 while its own non-tax revenue fell 68.49% in the same year, largely attributed to the state's ethnic conflict.",
  "152 Drawing and Disbursing Officers in Manipur kept ₹155.80 crore of non-salary government funds parked in 226 commercial/nationalised bank accounts outside the official Government Account, in breach of Finance Department orders.",
  "Manipur ranks third among 27 Indian states in tax elasticity (1.49) over 2004-05 to 2021-22, behind only Nagaland (1.57) and Arunachal Pradesh (1.52).",
  "On average between 2012-13 and 2023-24, Manipur's own tax revenue could finance only 9.29% of its revenue expenditure, leaving the rest dependent on central transfers.",
  "Meghalaya had ₹6,833.02 crore in excess expenditure over grants and appropriations dating all the way back to 1971-72 that still had not been regularised by the State Legislature as of the 2023-24 report.",
  "Meghalaya's revenue balance swung from a deficit of ₹43.90 crore in 2022-23 to a surplus of ₹1,394.32 crore in 2023-24, a 3,276% jump in a single year.",
  "Power sector public sector undertakings accounted for 93.45% of the ₹676.15 crore in total losses posted by Meghalaya's state PSUs in 2021-22.",
  "Despite the service sector generating 55.53% of Meghalaya's GSDP in 2021-22, it attracted only 1.46% of the state's total investment in public sector undertakings that year.",
  "Mizoram's per capita GSDP of ₹2,86,004 in 2023-24 exceeded both the all-India per capita GDP (₹2,11,725) and the average for North-Eastern and Himalayan states (₹2,01,137).",
  "Mizoram's committed and inflexible expenditure (salaries, pensions, interest) consumed 69.98% of revenue expenditure in 2023-24, leaving little fiscal room for other priorities.",
  "More than 80% of Mizoram's total revenue comes from central grants-in-aid and tax devolution, with the state generating only about ₹2,085 crore of its own ₹12,666 crore in estimated revenue for 2023-24.",
  "178 of Mizoram's 1,276 Drawing and Disbursing Officers reported keeping ₹317.21 crore of government funds in savings/current bank accounts outside the official Government Account as of 31 March 2024.",
  "Nagaland's infant mortality rate was just 4 per 1,000 live births in 2024, far below the all-India average of 28 per 1,000.",
  "Nagaland's committed and inflexible expenditure reached ₹12,059.15 crore in 2023-24, equal to 81.37% of its revenue expenditure.",
  "A post-audit reclassification found Nagaland's reported revenue surplus of ₹1,335.43 crore was actually ₹1,279.80 crore, and its fiscal deficit was understated, rising from ₹1,784.45 crore to ₹1,826.63 crore once corrected.",
  "Grants-in-aid's share of Nagaland's revenue fell from 76.4% in 2012-13 to 46.1% in 2023-24, even as central tax devolution grew from 14.8% to 39.8% of revenue over the same period.",
  "Odisha's debt-to-GSDP ratio stood at just 12% in 2022-23, well below the 25% threshold considered sustainable for Indian states.",
  "The buoyancy of Odisha's own revenue receipts (how responsive revenue growth is to GSDP growth) fell to -1.4 in 2022-23, meaning revenue actually shrank even as the economy grew.",
  "Odisha had ₹11,417.84 crore parked in Personal Deposit Accounts of 392 Administrators as of March 2025, including ₹647.52 crore transferred to a tribal welfare agency via nine sanction orders issued in February-March 2025 without any immediate spending need.",
  "Odisha's subsidy expenditure jumped 121.54% to ₹9,134 crore in 2024-25, driven mainly by a new ₹5,848.70 crore farmer input assistance scheme called Samrudh Krushak Yojana.",
  "Punjab spent only 3.88% of its total expenditure on capital account in 2023-24, and capital expenditure amounted to just 4.40% of total borrowings, meaning borrowed funds went mainly to consumption rather than asset creation.",
  "Power subsidies made up 92 to 99% of Punjab's total subsidy bill, which grew from ₹10,161 crore in 2019-20 to ₹18,770 crore in 2023-24.",
  "Between 2019-20 and 2023-24, Punjab used between 87.94% and 117.01% of its total debt receipts just to repay principal and interest on earlier borrowings, meaning in some years it borrowed more than it needed purely to service old debt.",
  "Punjab's revenue deficit reached ₹26,045 crore and its fiscal deficit ₹33,930 crore in 2022-23, with the debt-to-GSDP ratio at 43.64%.",
  "Rajasthan failed to achieve a zero revenue deficit for the 11th consecutive year in 2023-24, despite the FRBM Act requiring zero revenue deficit since 2011-12.",
  "Only 8.76% of Rajasthan's net borrowings in 2023-24 went toward capital creation, and more than 87% of the state's borrowings over the preceding five years were used simply to repay outstanding debt including interest.",
  "Rajasthan's use of Ways and Means Advances from the RBI jumped from 3 occasions in 2019-20 to 170 occasions in 2023-24, signaling worsening short-term liquidity management.",
  "Rajasthan's outstanding government guarantees rose to ₹1,10,918 crore in 2023-24, equal to 54.57% of the state's revenue receipts for the year.",
  "Sikkim's Power Department earned ₹359.02 crore in 2023-24 (₹300.03 crore in royalty revenue plus ₹58.99 crore from power sales) that was never deposited into the Government Account, and was instead spent directly on power purchases and loan repayment outside government books.",
  "Sikkim's nominal per capita income is 3.2 times higher than the national average, as of 2021-22.",
  "Of the ₹1,353.15 crore total profit earned by 10 state public enterprises in Sikkim, 99.70% came from just three of them, and only one of the ten profitable enterprises actually declared a dividend.",
  "Sikkim's contingent liabilities stood at 10.4% of GSDP in 2022-23, much higher than a median Indian state, and could push its debt-to-GSDP ratio up by 6 percentage points over five years if those liabilities are absorbed.",
  "Despite historically leading Indian states in per capita own tax revenue, Tamil Nadu now ranks 7th in per capita revenue receipts and 6th in per capita own tax revenue, with its own tax-to-GSDP ratio falling from 7.92% in 2011-12 to 5.93% in 2021-22.",
  "Tamil Nadu's outstanding government guarantees totaled ₹1,22,269.91 crore as of 31 March 2024, equal to 50.16% of the state's total revenue receipts.",
  "The combined net losses of Tamil Nadu's state PSUs more than doubled from ₹8,435 crore in 2016-17 to ₹20,545 crore in 2021-22, driven largely by power utilities TANGEDCO (₹11,955 crore loss) and TANTRANSCO (₹3,402 crore loss).",
  "Tamil Nadu's public debt reached ₹7,24,789 crore in 2023-24, and debt servicing exceeded 20% of revenue receipts, twice the 10% threshold recommended by the 14th Finance Commission.",
  "Telangana's official revenue surplus of ₹5,944 crore in 2022-23 was overstated by ₹4,264 crore due to accounting gaps like non-contribution to the Consolidated Sinking Fund and Guarantee Redemption Fund, leaving an effective surplus of only ₹1,680 crore.",
  "Auditors assessed Telangana's undisclosed off-budget borrowings at around ₹1,18,629 crore, which would push the state's total liabilities-to-GSDP ratio to 35.64%, well above the 29.70% ceiling prescribed by the 15th Finance Commission.",
  "As of March 2023, Telangana had 20 incomplete irrigation projects begun between 1983 and 2018 whose combined cost had ballooned from an original ₹1,02,388 crore to ₹2,06,977 crore, with ₹1,73,564 crore already spent.",
  "Telangana did not disclose a ₹50,000 crore guarantee given to the Telangana State Civil Supplies Corporation, and its disclosed guarantees to the state's power distribution companies (DISCOMs) were short by ₹16,000 crore.",
  "In 2019-20, committed expenditure on salaries, pensions and interest consumed 83.25% of Tripura's revenue receipts (₹9,158.67 crore out of ₹11,001.59 crore).",
  "Despite holding a cash balance of ₹1,046.17 crore at the end of March 2020, Tripura continued taking market loans, a practice auditors called undesirable since it needlessly adds to debt liabilities while cash sits unused.",
  "The Tripura Building and Other Construction Workers' Welfare Board was sitting on an unspent Labour Cess balance of ₹229.90 crore as of March 2020, parked in bank fixed deposits rather than used for worker welfare.",
  "The year-on-year increase in Tripura's outstanding public debt rose from ₹6,603.03 crore (10.48% growth) in 2016-17 to ₹11,212.20 crore (26.78% growth) in 2019-20, while the debt-to-GSDP ratio climbed from 16.73% to 20.25% over the same period.",
  "Uttar Pradesh's fiscal position swung from a surplus of ₹11,083 crore (0.65% of GSDP) in 2019-20 to a deficit of ₹80,723 crore (3.17% of GSDP) in 2023-24.",
  "Uttar Pradesh's extra-budget borrowings through public sector enterprises reached ₹38,464.14 crore as of March 2024 — debt that never flows through the Consolidated Fund of the State but still has to be repaid.",
  "As of March 2024, ₹19,478.31 crore of central and state scheme funds in Uttar Pradesh sat unspent in the bank accounts of Single Nodal Agencies rather than being utilised.",
  "Uttar Pradesh's outstanding debt grew from ₹2,25,123.6 crore in 2012-13 to ₹7,47,545.7 crore in 2023-24 — more than tripling at an average annual growth rate of 11.6%.",
  "Uttarakhand's fiscal deficit more than doubled year-on-year, rising 162.77% from ₹2,949 crore in 2022-23 to ₹7,749 crore (2.24% of GSDP) in 2023-24.",
  "Uttarakhand's subsidy bill grew more than twelvefold from ₹35 crore in 2019-20 to ₹428 crore in 2023-24, with a single food subsidy scheme (₹104 crore) accounting for nearly a quarter of the total.",
  "Uttarakhand had ₹48,654.69 crore of excess expenditure from 2005-06 to 2022-23 still awaiting legislative regularisation, on top of a fresh ₹7,302.10 crore excess incurred in 2023-24 alone.",
  "Uttarakhand's industrial (secondary) sector share of GSDP shrank from 52.12% to 46.84% between 2012-13 and 2023-24, even as its own revenue share of total state receipts fell from 50.9% to 46.8% over the same period.",
  "As of March 2021, West Bengal had 3,94,162 outstanding utilisation certificates worth ₹2,29,099 crore that had never been submitted for grants already disbursed.",
  "41 of West Bengal's 85 state public sector enterprises had accumulated losses of ₹17,130 crore as of March 2021 — a figure that exceeded their combined paid-up capital of ₹2,407 crore.",
  "Only 25 of West Bengal's 85 state public sector enterprises had prepared accounts for 2020-21 by November 2021; the accounts of 46 enterprises were in arrears for one to five years.",
  "West Bengal's own tax revenue has hovered around 5% of GSDP since 2011-12, consistently trailing the all-state average of roughly 6-7%, with the gap widening further by 2023-24 (5.2% vs. 7.7% nationally).",
];

let _triviaIndex = 0;
let _triviaTimer = null;

function _shuffledTrivia() {
  const arr = TRIVIA_FACTS.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

let _triviaOrder = _shuffledTrivia();

/** Starts rotating facts into the element with id `elId`, one every `intervalMs`. */
function startTrivia(elId, intervalMs = 9000) {
  const el = document.getElementById(elId);
  if (!el) return;
  stopTrivia();
  _triviaOrder = _shuffledTrivia();
  _triviaIndex = 0;
  el.textContent = '💡 ' + _triviaOrder[0];
  el.classList.add('visible');
  _triviaTimer = setInterval(() => {
    _triviaIndex = (_triviaIndex + 1) % _triviaOrder.length;
    el.classList.remove('visible');
    setTimeout(() => {
      el.textContent = '💡 ' + _triviaOrder[_triviaIndex];
      el.classList.add('visible');
    }, 250);
  }, intervalMs);
}

function stopTrivia() {
  if (_triviaTimer) {
    clearInterval(_triviaTimer);
    _triviaTimer = null;
  }
}
