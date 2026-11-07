/* Fixed, fictional demo guideline pack. This is a local data file, not a live database. */
(() => {
  const groups = [
    ["Claims & evidence", [
      "Support every measurable performance claim with a dated source.","State the population, sample size, and conditions behind a result.","Do not turn a single customer story into a universal outcome.","Keep qualifiers that materially limit a claim beside the claim.","Do not imply a guarantee when evidence shows an average result.","Separate tested results from forecasts and product goals.","Use approved wording for customer counts and adoption figures.","Link comparisons to the specific approved benchmark.","Do not use superlatives such as ‘best’ without current substantiation.","Recheck evidence when a claim changes in meaning or scope."
    ]],
    ["Product accuracy", [
      "Describe only capabilities available in the named product version.","Do not imply a planned feature is currently available.","Use the approved product name and capitalization.","Do not promise compatibility unless it appears on the approved list.","State material prerequisites near the capability description.","Do not imply automation removes all need for human review.","Keep product limits visible when they affect the promised outcome.","Do not describe a prototype capability as generally available.","Use approved terms for setup, onboarding, and support.","Check feature names against the current product glossary."
    ]],
    ["Pricing & offers", [
      "Use the currently approved price and billing period.","Show mandatory fees alongside the advertised price.","State the end date for time-limited promotions.","Do not present a conditional discount as available to everyone.","Explain eligibility requirements for a special offer.","Do not describe a trial as free if payment details or fees apply.","State renewal terms where they materially affect the offer.","Use the approved currency and tax treatment for the audience.","Do not compare prices from different billing periods without explanation.","Recheck price claims against the current pricing source before release."
    ]],
    ["Comparisons", [
      "Name the comparison basis for every comparative claim.","Use comparable products, versions, and measurement conditions.","Do not imply competitor endorsement or partnership.","Keep competitor names and marks within approved usage rules.","Date external comparisons that may change over time.","Avoid claiming superiority from a non-representative test.","Do not omit a material limitation from a comparison chart.","Use neutral language when describing competing products.","Identify whether a comparison is based on internal or public data.","Revalidate comparative claims when either product changes."
    ]],
    ["Voice & tone", [
      "Use a confident, helpful tone without pressuring the reader.","Prefer plain language over unexplained technical jargon.","Avoid shaming or blaming customers for a problem.","Do not use fear to create urgency without a factual basis.","Keep humour respectful and appropriate to the audience.","Avoid absolute promises such as ‘always’ and ‘never’ without proof.","Use inclusive language and avoid stereotypes.","Keep calls to action clear and proportionate to the content.","Do not imitate a competitor’s distinctive voice or campaign.","Preserve the creator’s central purpose when suggesting edits."
    ]],
    ["Terminology", [
      "Use approved names for plans, services, and product components.","Expand an acronym the first time it appears for a general audience.","Do not use internal project codenames in public copy.","Use the approved spelling of brand and partner names.","Keep feature labels consistent across the article.","Do not call a customer a user unless that term is approved.","Use the current terminology for accessibility features.","Avoid terms marked retired in the company glossary.","Use the approved descriptor for the organisation.","Flag conflicting terms for editorial review rather than guessing."
    ]],
    ["Audience & clarity", [
      "Make the intended audience clear when eligibility is restricted.","Explain who can use a feature when access is limited.","Put the main benefit before secondary details.","Define unfamiliar terms near their first use.","Do not imply a service is available in a location without confirmation.","Clarify whether a statement applies to individuals or organisations.","Distinguish required steps from optional recommendations.","Avoid ambiguous references such as ‘this’ when the subject is unclear.","Keep important conditions close to the relevant claim.","Provide a clear next step when asking the reader to act."
    ]],
    ["Disclosures & legal", [
      "Include required sponsorship or material-connection disclosures.","Do not present a testimonial as typical without supporting evidence.","Use only testimonials with documented permission.","Identify paid or incentivised endorsements clearly.","Do not imply legal, financial, or medical advice where none is provided.","Keep required disclaimers readable and near the relevant claim.","Do not hide material conditions in unrelated footnotes.","Use approved consent language when requesting sensitive information.","Escalate regulated claims to the designated human reviewer.","Do not state legal compliance as a guarantee without approval."
    ]],
    ["Safety & wellbeing", [
      "Do not promise a health outcome without approved evidence.","Avoid implying a product diagnoses or treats a condition unless authorised.","State material safety instructions near the described use.","Do not encourage unsafe use to demonstrate a product benefit.","Keep risk information accurate and proportionate.","Escalate safety-related claims for specialist review.","Do not use imagery that misrepresents safe product use.","Identify age or supervision restrictions where applicable.","Avoid certainty when evidence describes only a possible outcome.","Do not replace emergency guidance with promotional messaging."
    ]],
    ["Privacy & data", [
      "Do not expose personal or confidential information in examples.","Use synthetic data in public-facing demonstrations.","Do not imply personal data is collected unless the process does so.","Describe data use only as stated in the approved privacy source.","Remove identifiers from customer stories unless permission is recorded.","Do not promise anonymity without checking the actual data flow.","Avoid including credentials, access tokens, or private URLs.","Escalate claims about security or encryption for technical review.","Do not imply data is never shared unless the policy confirms it.","Use approved language for retention and deletion claims."
    ]],
    ["Accessibility", [
      "Provide meaningful alternative text for informative images.","Do not put essential text only inside an image.","Use link text that describes its destination or action.","Keep headings descriptive and in a logical order.","Avoid relying on colour alone to communicate a status.","Use captions or transcripts for meaningful audio and video.","Write instructions that do not depend only on visual position.","Use readable contrast for text and controls.","Expand abbreviations when needed for screen-reader clarity.","Ensure calls to action have a clear accessible name."
    ]],
    ["Readability & format", [
      "Use sentence case for headings unless a brand exception applies.","Break long instructions into short steps or bullets.","Use numerals consistently for measurements and statistics.","Write dates unambiguously for the intended audience.","Keep punctuation and quotation style consistent.","Avoid all-caps paragraphs in reader-facing copy.","Use descriptive captions for charts and tables.","Do not use decorative symbols as the only label for meaning.","Keep paragraph length manageable on mobile screens.","Check that headings accurately describe the section below them."
    ]],
    ["Visual assets", [
      "Use only approved logos and current brand artwork.","Do not stretch, recolour, or crop a logo outside its usage rules.","Confirm permission for third-party images before publication.","Do not present illustrative mockups as real customer results.","Label fictional interface examples as demonstrations.","Use current product screenshots when showing real features.","Do not imply endorsement through unapproved logo placement.","Check that charts preserve scale and context.","Avoid visual before-and-after claims without approved evidence.","Add source or attribution details where the asset licence requires them."
    ]],
    ["Dates & availability", [
      "Use a clear effective date for time-sensitive product information.","Do not describe a discontinued offer as currently available.","State regional availability when it differs by location.","Keep launch dates aligned with the approved release schedule.","Do not promise delivery dates without an approved source.","Use current contact and support hours.","Recheck event, deadline, and campaign dates before release.","Mark historical figures with the period they describe.","Do not imply continuous availability during a planned outage.","Escalate uncertain availability claims rather than assuming."
    ]],
    ["Approval & workflow", [
      "Submit the complete draft version intended for publication.","Record the reviewer decision against the version they inspected.","Any substantive edit after approval requires another review.","Give a reason when returning content for changes.","Allow creators to challenge a finding with supporting context.","Route legal, pricing, and safety concerns to an authorised reviewer.","Do not treat an automated flag as a final publication decision.","Keep a trace of source versions used during a review.","Mark approval as ready to publish, not as proof of external publication.","Record human overrides with the reviewer and rationale."
    ]]
  ];
  const rules = [];
  groups.forEach(([category, entries]) => entries.forEach((text, index) => {
    const n = rules.length + 1;
    rules.push({id:`DG-${String(n).padStart(3,'0')}`, category, title:text.replace(/[.?!]$/,'').slice(0,74), text, severity:[0,1,2,3].includes(index%5)?'Standard':'High', source:'Northstar demo brand handbook · v1.0'});
  }));
  window.EVIDENCEMINT_GUIDELINES = rules;
})();
