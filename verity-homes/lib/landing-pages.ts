// SEO / ad landing pages (Unit 21 step 6b). ALL the wording for the five pages lives in this
// one file: change a sentence here and the page, its <title>, meta description and FAQ follow.
// Rendering: components/site/landing/landing-page.tsx. Routes: app/(site)/<path>/page.tsx.
//
// Rules for editing (checked by tests/unit/landing-pages.test.ts):
// - title ≤ 60 characters and description ≤ 155, both containing `phrase`;
// - intro + body between 500 and 800 words; 3 "Why Verity" points; 4–5 FAQs;
// - no invented facts: no statistics, prices, return figures or laws that the owner hasn't
//   given. The property-investment page never states or promises returns (Open question 54,
//   legal review pending).
// The copy adapts the published blog posts (buying a house, buying land, building) and the
// company story in site settings.
import type { ListingType } from "@/lib/generated/prisma/client";

/** One piece of body copy: a heading, a paragraph, or a bullet list. */
export type LandingBlock = { h2: string } | { p: string } | { ul: string[] };

export type LandingFaq = { q: string; a: string };
export type WhyPoint = { title: string; text: string };

export type LandingPage = {
  /** The page's address, e.g. "/buy-house-lagos". */
  path: string;
  /** The search phrase the page is for; must appear in the title and description. */
  phrase: string;
  h1: string;
  /** <title>, ≤ 60 characters. */
  title: string;
  /** Meta description, ≤ 155 characters. */
  description: string;
  /** Small label above the H1. */
  eyebrow: string;
  /** Under the H1. */
  intro: string;
  /** Hero photo (public/). */
  image: string;
  /** Enquiry form: fixed interest, heading and starting message. */
  interest: "BUYING" | "RENTING" | "LAND" | "INVESTING" | "MANAGEMENT";
  formHeading: string;
  formMessage: string;
  /** WhatsApp text after "Hello Verity, " — the page URL is added after it. */
  whatsappText: string;
  /** The live listings block: which listing types, its heading and the "see all" link. */
  listings: { types: ListingType[]; heading: string; allHref: string; allLabel: string };
  body: LandingBlock[];
  /** Defaults to WHY_VERITY. */
  why?: WhyPoint[];
  faqs: LandingFaq[];
  /** Blog post slugs linked from the page (only published ones show). */
  relatedPosts: string[];
  /** Bottom call to action. */
  ctaHeading: string;
  ctaText: string;
};

/** From the company story (Admin → Settings → Website text). */
export const WHY_VERITY: WhyPoint[] = [
  {
    title: "Titles checked first",
    text: "We check the title documents before we recommend a property, so you never have to wonder whether the papers are real.",
  },
  {
    title: "Every fee in writing",
    text: "You get a written breakdown of every cost before you commit. No surprises after you have paid.",
  },
  {
    title: "With you at every stage",
    text: "Our founder, Esther Ezenagu, and the team keep you informed from the first question to the day the deal is done.",
  },
];

export const LANDING_PAGES = [
  // ------------------------------------------------------------------ buy a house
  {
    path: "/buy-house-lagos",
    phrase: "Buy a House in Lagos",
    h1: "Buy a House in Lagos — Verified Homes, Honest Advice",
    title: "Buy a House in Lagos — Verified Homes, Honest Advice",
    description:
      "Buy a house in Lagos with confidence: homes with checked documents, every fee in writing and inspections in person or by video. Talk to Verity today.",
    eyebrow: "Homes for sale",
    intro:
      "Buying a home is one of the biggest decisions you will make. In Lagos, where prices, locations and documents vary widely, a clear plan and an honest adviser make all the difference.",
    image: "/samples/dusk.jpg",
    interest: "BUYING",
    formHeading: "Looking for a home?",
    formMessage: "I'd like help buying a house in Lagos. Please contact me.",
    whatsappText: "I'd like help buying a house in Lagos",
    listings: {
      types: ["SALE", "OFF_PLAN"],
      heading: "Homes for sale now",
      allHref: "/properties?type=sale",
      allLabel: "All homes for sale",
    },
    body: [
      { h2: "How to buy a house in Lagos, step by step" },
      {
        p: "This is the process we walk every buyer through. Follow it in order and most of the costly surprises people warn you about simply never happen.",
      },
      { h2: "1. Set a realistic budget" },
      {
        p: "Your budget is more than the price of the house. Plan for your lawyer's fees, agency fees if an agent is involved, documentation and registration costs such as Governor's Consent, and repairs or finishing — especially for older or carcass buildings. Ask for a written breakdown of all fees before you commit.",
      },
      { h2: "2. Choose the right location" },
      {
        p: "Location shapes your daily life and the future value of your home. Think about:",
      },
      {
        ul: [
          "your commute to work or school, and traffic at peak hours;",
          "road access, drainage and the area's flooding history;",
          "security and how the estate is managed;",
          "power and water supply in the area.",
        ],
      },
      { h2: "3. Inspect properly" },
      {
        p: "Photos can be misleading. Inspect the house in person, or by live video if you live abroad. Check the walls for cracks, the roof for leaks, the plumbing, the wiring and the finishing. If the building is new, ask who built it and whether it has an approved building plan. If you can, see it in the rain or right after: water reveals what paint can hide.",
      },
      { h2: "4. Check the documents" },
      {
        p: "Ask for the title document of the land the house sits on and the approved building plan. Your lawyer should verify them at the Land Registry and confirm that the seller has the right to sell. In an estate, also ask for the estate rules and the service charge details.",
      },
      { h2: "5. Agree the price and terms, then pay safely" },
      {
        p: "Agree the price, the payment schedule and what is included — fittings, a generator, furniture — and put it all in a Contract of Sale reviewed by your lawyer. Pay only into a verified company or seller account, keep a receipt for every payment, and never hand cash to anyone, however urgent they make it sound.",
      },
      { h2: "6. Complete the paperwork and collect your keys" },
      {
        p: "After payment you should receive a Deed of Assignment and the other transfer documents. Your lawyer will help you register the transfer and, where needed, apply for Governor's Consent so the house is properly recorded in your name.",
      },
      { h2: "Off-plan or completed?" },
      {
        p: "Buying off-plan can mean a lower entry price and a payment plan, but you are trusting a developer to finish. Ask who the developer is and what they have built before, whether the building plan is approved, how payments are tied to construction stages, and what happens if handover is late. Get all of it in writing.",
      },
      { h2: "Buying from abroad" },
      {
        p: "Many of our clients live outside Nigeria. You can still buy safely with video inspections, a lawyer you trust, and a property company that shares documents openly and answers every question honestly. That is how we work.",
      },
      {
        p: "When we show you a home, we tell you what title it has, share the documents with you and your lawyer, give you every fee in writing and arrange an inspection — in person or by video.",
      },
    ],
    faqs: [
      {
        q: "What costs should I budget for apart from the price?",
        a: "Legal fees, agency fees if an agent is involved, documentation and registration costs such as Governor's Consent, and any repairs or finishing. We give you a written breakdown before you commit.",
      },
      {
        q: "Which documents should a house in Lagos have?",
        a: "The title document for the land (for example a Certificate of Occupancy, Governor's Consent or a registered Deed of Assignment) and the approved building plan. Your lawyer should verify them at the Land Registry.",
      },
      {
        q: "Can I buy a house in Lagos while living abroad?",
        a: "Yes. We can show you the house by live video, share every document with you and your lawyer, and keep you updated at each step until the keys are handed over.",
      },
      {
        q: "Can I inspect a house before I pay anything?",
        a: "Yes, and you should. Ask us to book an inspection with the form on this page or on WhatsApp.",
      },
      {
        q: "How do I pay safely?",
        a: "Only into a verified company or seller account, with a receipt for every payment. Never in cash to an agent.",
      },
    ],
    relatedPosts: ["buying-house-lagos-guide", "buying-land-lagos-checks"],
    ctaHeading: "Ready to find your home?",
    ctaText:
      "Tell us your budget and the areas you like. We will send you homes that fit, with their documents checked.",
  },

  // ------------------------------------------------------------------ land
  {
    path: "/land-for-sale-lagos",
    phrase: "Land for Sale in Lagos",
    h1: "Land for Sale in Lagos — C of O & Governor's Consent Checked",
    title: "Land for Sale in Lagos — C of O & Governor's Consent Checked",
    description:
      "Land for sale in Lagos with the title checked before you pay: C of O, Governor's Consent and survey plan reviewed. See plots and book an inspection.",
    eyebrow: "Land for sale",
    intro:
      "Land is one of the most popular long-term investments in Lagos, but it is also where many buyers lose money. Most land problems can be avoided with a few careful checks, done in the right order, before you pay a kobo.",
    image: "/samples/aerial.jpg",
    interest: "LAND",
    formHeading: "Interested in land?",
    formMessage: "I'm looking for land for sale in Lagos. Please contact me.",
    whatsappText: "I'm looking for land for sale in Lagos",
    listings: {
      types: ["LAND"],
      heading: "Plots for sale now",
      allHref: "/properties?type=land",
      allLabel: "All land for sale",
    },
    body: [
      { h2: "Seven checks before you buy land in Lagos" },
      {
        p: "These are the checks we recommend to every client, and the ones we do ourselves before we put a plot in front of you.",
      },
      { h2: "1. Know exactly what land you are buying" },
      {
        p: "Ask for the full address, the size of the plot and the survey plan. The survey plan shows the exact boundaries and coordinates. Without it, you cannot be sure that the plot you visited is the plot on the documents.",
      },
      { h2: "2. Check the title document" },
      {
        p: "The title tells you what kind of ownership the seller has. Common titles in Lagos include:",
      },
      {
        ul: [
          "Certificate of Occupancy (C of O);",
          "Governor's Consent;",
          "Excision or Gazette, for family or community land released by government;",
          "a registered Deed of Assignment.",
        ],
      },
      {
        p: "Each gives a different level of security. Ask which title the land has and request a copy.",
      },
      { h2: "3. Search the land at the Land Registry" },
      {
        p: "A copy of a document is not proof. Your lawyer or surveyor should search the title at the Land Registry to confirm it is genuine, who owns it, and whether anything is recorded against it.",
      },
      { h2: "4. Make sure it is not under government acquisition" },
      {
        p: "Some land is committed to government projects such as roads or drainage. A surveyor can check the survey plan against government records. Never buy land that is under acquisition — it can be taken back.",
      },
      { h2: "5. Verify the seller" },
      {
        p: "Make sure the person selling has the right to sell. Family land should be approved by the recognised family heads; in an estate, confirm the developer owns or controls the land. Ask for valid ID and, where relevant, company registration.",
      },
      { h2: "6. Visit the land — more than once" },
      {
        p: "See the plot in person, or ask for a video inspection if you live abroad. Look at the access road, drainage, neighbouring buildings and whether anyone is already using the land. Visit in the rainy season if you can, to check for flooding.",
      },
      { h2: "7. Pay safely and get the right papers" },
      {
        ul: [
          "Pay into a company or verified account, never in cash to an agent.",
          "Collect a receipt for every payment.",
          "After payment, make sure you receive a Contract of Sale, a Deed of Assignment and a survey in your name.",
          "Use your own lawyer to review the documents before you sign.",
        ],
      },
      { h2: "Buying a plot in an estate" },
      {
        p: "Estates make many of these checks simpler, but ask the same questions. Which title covers the estate? What documents will you receive for your plot? Which fees come with it — for example survey, legal or development charges — and when are they due? Get the answers in writing before you pay.",
      },
      {
        p: "Buying land should feel exciting, not stressful. A little time spent on the title, the seller and the plot itself protects your money and your peace of mind. When we show you a plot, we tell you its title, share the survey and documents, and arrange an inspection.",
      },
    ],
    faqs: [
      {
        q: "What is the difference between a C of O and Governor's Consent?",
        a: "Both are title documents, and each gives a different level of security. Ask which one the land has, request a copy, and have your lawyer search it at the Land Registry before you pay.",
      },
      {
        q: "What is a survey plan and why does it matter?",
        a: "It shows the exact boundaries and coordinates of the plot. It is how you confirm that the land you visited is the land on the documents, and how a surveyor checks for government acquisition.",
      },
      {
        q: "Can I buy land in Lagos from abroad?",
        a: "Yes. We can inspect the plot with you by live video, share the title and survey with you and your lawyer, and send you receipts and documents for every step.",
      },
      {
        q: "What documents should I receive after paying?",
        a: "A Contract of Sale, a Deed of Assignment and a survey in your name, plus a receipt for every payment.",
      },
      {
        q: "Can I inspect a plot before paying?",
        a: "Always. Ask for an inspection with the form on this page or on WhatsApp, and visit more than once if you can.",
      },
    ],
    relatedPosts: ["buying-land-lagos-checks", "building-lagos-development-guide"],
    ctaHeading: "Found a plot you like?",
    ctaText:
      "Send it to us or ask what we have now. We will tell you what the title is, show you the documents and arrange an inspection.",
  },

  // ------------------------------------------------------------------ investment
  // NO return figures, percentages or promises here (Q54: legal review pending).
  {
    path: "/property-investment-lagos",
    phrase: "Property Investment in Lagos",
    h1: "Property Investment in Lagos — Clear Terms, Written Agreements",
    title: "Property Investment in Lagos — Clear, Written Terms",
    description:
      "Property investment in Lagos with clear terms, written agreements and regular updates. Ask the right questions before you invest. Talk to Verity.",
    eyebrow: "Property investment",
    intro:
      "Investing in Lagos property should not feel like a gamble. Before any money changes hands you should know exactly what you are putting your money into, what is written down, and how you will be kept informed.",
    image: "/samples/building.jpg",
    interest: "INVESTING",
    formHeading: "Talk to us about investing",
    formMessage: "I'd like to talk about property investment in Lagos. Please contact me.",
    whatsappText: "I'd like to talk about property investment in Lagos",
    listings: {
      types: ["LAND", "OFF_PLAN"],
      heading: "Land and off-plan properties",
      allHref: "/properties",
      allLabel: "All properties",
    },
    body: [
      { h2: "How we approach property investment" },
      {
        p: "Verity was started on a simple belief: buying or investing in property should not feel like a gamble. Too many people are held back by fear of fake documents, hidden costs and promises that are never kept. So we work the other way round: clear terms, written agreements and regular updates, so you always know where your money is.",
      },
      { h2: "Questions to ask before you invest" },
      {
        p: "Whoever you invest with, these questions protect you. A trustworthy company will answer every one of them in writing.",
      },
      {
        ul: [
          "What exactly am I investing in — which land or which development, and where is it?",
          "Who holds the title to the land, and which title document is it?",
          "Is everything I have been told written in the agreement?",
          "What are the timelines, and what happens if they slip?",
          "How and when will I get updates — photos, videos, documents, receipts?",
          "What are the terms for leaving the investment early?",
          "Who are the partners or developers involved, and what is their track record?",
        ],
      },
      { h2: "Check the land and the project" },
      {
        p: "Every property investment rests on land. The same checks apply as when you buy a plot: confirm the title (for example a C of O or Governor's Consent), search it at the Land Registry, make sure the land is not under government acquisition, and match the survey plan to the site. For a development, ask whether the building plan has been approved and who is building it.",
      },
      { h2: "Read the agreement — with your own lawyer" },
      {
        p: "Never rely on a brochure or a WhatsApp message. The agreement is what counts. Read it carefully, ask about anything that is unclear, and have your own lawyer review it before you sign. If a promise is not in the agreement, treat it as if it was never made.",
      },
      { h2: "Understand the risks" },
      {
        p: "Property can be a strong long-term investment, but it is not risk-free. Values can go down as well as up, projects can take longer than planned, and money in property is not always easy to take out quickly. Be wary of anyone who guarantees a result or pressures you to pay quickly.",
      },
      { h2: "Pay safely and keep records" },
      {
        ul: [
          "Pay only into a company or verified account, never cash to an agent.",
          "Collect a receipt for every payment.",
          "Keep copies of the agreement, receipts and every update you receive.",
        ],
      },
      { h2: "Investing from abroad" },
      {
        p: "Many investors live outside Nigeria. Choose a company that sends regular photo and video updates, shares receipts, and lets you see the documents. Transparency is the best protection.",
      },
      { h2: "Start with a conversation" },
      {
        p: "Tell us what you would like to achieve, the amount you are comfortable with and your timeline. We will explain the options in plain English and send the terms in writing, so you can review them with your lawyer and your family before you decide. Our investment plans are explained one to one — ask us which plans are open now.",
      },
    ],
    why: [
      {
        title: "Clear terms",
        text: "We explain exactly what you are investing in and every cost, in plain English, before you decide.",
      },
      {
        title: "Written agreements",
        text: "Everything we agree is put in writing, for you and your lawyer to review before you sign.",
      },
      {
        title: "Regular updates",
        text: "We keep you informed at every stage, so you always know where your money is.",
      },
    ],
    faqs: [
      {
        q: "Can I see the agreement before I commit?",
        a: "Yes. You get the full written agreement first, and we encourage you to have your own lawyer review it.",
      },
      {
        q: "How will I know how my investment is doing?",
        a: "We keep you informed at every stage with updates, documents and receipts, so you always know where your money is.",
      },
      {
        q: "Can I invest from outside Nigeria?",
        a: "Yes. Everything can be explained, reviewed and signed remotely, with updates sent to you wherever you are.",
      },
      {
        q: "Is property investment risk-free?",
        a: "No investment is. Property values can go down as well as up and projects can be delayed. We explain the risks and the terms honestly so you can decide with your eyes open.",
      },
      {
        q: "Which investment plans are available?",
        a: "Ask us on WhatsApp or with the form on this page and we will explain the plans open now, one to one.",
      },
    ],
    relatedPosts: ["buying-land-lagos-checks", "building-lagos-development-guide"],
    ctaHeading: "Want to talk it through?",
    ctaText:
      "No pressure, no obligation. Tell us what you would like to invest and we will explain the options and the terms in writing.",
  },

  // ------------------------------------------------------------------ rent
  {
    path: "/rent-apartment-lagos",
    phrase: "Apartments for Rent in Lagos",
    h1: "Apartments for Rent in Lagos — Inspected, No Hidden Fees",
    title: "Apartments for Rent in Lagos — Inspected, No Hidden Fees",
    description:
      "Apartments for rent in Lagos, inspected before you pay, with every fee and term in writing. See what is available and book a viewing with Verity.",
    eyebrow: "Apartments for rent",
    intro:
      "Finding a good apartment in Lagos takes more than scrolling through photos. The right flat is in the right area, is in good condition, and comes with clear terms — and you should know every fee before you pay anything.",
    image: "/samples/tower.jpg",
    interest: "RENTING",
    formHeading: "Looking for an apartment?",
    formMessage: "I'm looking for an apartment to rent in Lagos. Please contact me.",
    whatsappText: "I'm looking for an apartment to rent in Lagos",
    listings: {
      types: ["RENT"],
      heading: "Apartments and homes for rent",
      allHref: "/properties?type=rent",
      allLabel: "All homes for rent",
    },
    body: [
      { h2: "How to rent an apartment in Lagos without surprises" },
      {
        p: "Here is how we help tenants find the right home — and the checks you should make whoever you rent from.",
      },
      { h2: "1. Know your full budget" },
      {
        p: "The rent is only part of the cost of moving in. Before you pay, ask for a written list of everything due: the rent and how many months it covers, any agency, legal or caution fees, the service charge in an estate, and what the service charge pays for. If a fee is not on the list, ask why. We give you that list up front.",
      },
      { h2: "2. Pick the area before the apartment" },
      {
        p: "A beautiful flat in the wrong place becomes a daily struggle. Think about:",
      },
      {
        ul: [
          "your commute to work or school, and traffic at peak hours;",
          "road access and drainage — ask how the street copes in heavy rain;",
          "security, and how the building or estate is managed;",
          "power and water supply.",
        ],
      },
      { h2: "3. Inspect before you pay" },
      {
        p: "Never pay for an apartment you have not seen, in person or by live video. Check the walls and ceilings for cracks or damp, test the taps, toilets and sockets, look at the kitchen and the windows, and ask about water pressure and how often the power goes off. If you can, view it during or just after rain.",
      },
      { h2: "4. Read the tenancy agreement" },
      {
        p: "Your agreement should state the rent, the period it covers, every fee, who handles which repairs, notice periods and how renewal works. Read it before you sign, ask about anything unclear, and keep a signed copy.",
      },
      { h2: "5. Pay safely" },
      {
        ul: [
          "Pay only into a verified company or landlord account — never cash.",
          "Get a receipt for every payment.",
          "Do not pay a fee to someone who cannot show they act for the landlord.",
        ],
      },
      { h2: "6. Move in with a record" },
      {
        p: "On moving day, take dated photos of every room and note anything already damaged. It protects you when you move out and makes conversations with the landlord simple. Send a copy of the photos to the landlord or manager the same day, so you both have the same record.",
      },
      { h2: "Renting from abroad, or for a relative" },
      {
        p: "If you are relocating or renting for family, we can show you apartments by live video, send the agreement and the list of fees for review, and help with the handover.",
      },
      { h2: "Before you renew" },
      {
        p: "Ask for any change to the rent or the terms in writing well before your renewal date, so you have time to decide. Keep every receipt and your signed agreement together — they are your proof if there is ever a disagreement.",
      },
      {
        p: "When we show you an apartment, you see it in person or by video, you get the full list of fees in writing, and we walk you through the agreement before you pay. Every apartment we let comes with clear terms for landlords and tenants.",
      },
    ],
    faqs: [
      {
        q: "What fees should I expect when renting?",
        a: "The rent itself, plus any agency, legal, caution or service-charge fees that apply. We give you a written list of every fee before you pay anything.",
      },
      {
        q: "Can I view an apartment before paying?",
        a: "Yes, always — in person or by live video. Book a viewing with the form on this page or on WhatsApp.",
      },
      {
        q: "Who is responsible for repairs?",
        a: "It depends on the tenancy agreement, which should say clearly who handles which repairs. Read it before you sign.",
      },
      {
        q: "Can I rent an apartment in Lagos while abroad?",
        a: "Yes. We can show you apartments by video and send the agreement and fees for you to review before you commit.",
      },
    ],
    relatedPosts: ["buying-house-lagos-guide"],
    ctaHeading: "Tell us what you need",
    ctaText:
      "Share your budget, the areas you like and when you want to move. We will send you apartments that fit and arrange viewings.",
  },

  // ------------------------------------------------------------------ management
  {
    path: "/property-management-lagos",
    phrase: "Property Management in Lagos",
    h1: "Property Management in Lagos for Local & Diaspora Landlords",
    title: "Property Management in Lagos for Local & Diaspora Landlords",
    description:
      "Property management in Lagos: lettings, rent collection, maintenance and tenant care, with updates and receipts for landlords at home or abroad.",
    eyebrow: "Property management",
    intro:
      "Owning property in Lagos should give you income and peace of mind, not a second job. Whether you live in Lagos or abroad, we look after the day-to-day so your property runs smoothly — and we keep you informed at every stage.",
    image: "/samples/villa.jpg",
    interest: "MANAGEMENT",
    formHeading: "Need a property managed?",
    formMessage: "I'd like to talk about property management in Lagos. Please contact me.",
    whatsappText: "I'd like to talk about property management in Lagos",
    listings: {
      types: ["RENT"],
      heading: "Homes we are letting now",
      allHref: "/properties?type=rent",
      allLabel: "All homes for rent",
    },
    body: [
      { h2: "What property management covers" },
      {
        p: "Good management protects the value of your property and your rental income. These are the areas we handle for landlords:",
      },
      {
        ul: [
          "Lettings: marketing the property and agreeing clear written terms with tenants.",
          "Rent collection, with a receipt and a record for every payment.",
          "Maintenance and repairs, so small problems do not become expensive ones.",
          "Tenant care: answering tenants' questions and dealing with issues quickly.",
          "Updates and records, so you always know what is happening with your property.",
        ],
      },
      { h2: "Clear terms for landlords and tenants" },
      {
        p: "Most disputes between landlords and tenants start with something that was never written down. Every letting we handle has a tenancy agreement that sets out the rent, the period, every fee, who handles which repairs, notice periods and renewal. Clear terms keep good tenants and protect you if something goes wrong.",
      },
      { h2: "Every cost explained in writing" },
      {
        p: "You will know what our management service costs, and what any repair or job will cost, before it happens. We explain every fee in writing and agree the larger spending with you first.",
      },
      { h2: "For landlords who live abroad" },
      {
        p: "Managing a property in Lagos from London, Houston or Dubai is hard when you rely on favours from friends and family. If you live outside Nigeria, ask any manager — including us — for these things:",
      },
      {
        ul: [
          "regular photo and video updates of the property;",
          "receipts for rent received and money spent;",
          "your approval before major spending;",
          "copies of tenancy agreements and important documents.",
        ],
      },
      {
        p: "Transparency is the best protection. It is also how we work.",
      },
      { h2: "Choosing the right tenant" },
      {
        p: "A good tenant matters more than a quick letting. A careful letting process meets the applicant, asks for references, and confirms their work or business details before terms are agreed. It takes a little longer and saves a great deal of trouble later.",
      },
      { h2: "Looking after the building" },
      {
        p: "Regular checks catch small problems before they become expensive ones: the roof, plumbing and drainage before the rainy season, the wiring, and any shared equipment. Every job should come with a cost agreed in advance, a receipt and before-and-after photos.",
      },
      { h2: "When a tenant leaves" },
      {
        p: "Compare the property with the photos taken on moving-in day, agree any repairs fairly, and get the home ready for the next tenant quickly, so it is not empty for longer than it needs to be.",
      },
      { h2: "Keep good records" },
      {
        p: "Copies of the title, approvals, tenancy agreements, receipts and progress photos protect you if there is a dispute, and add value when you sell or let the property again. We keep them organised for you.",
      },
      { h2: "Getting started" },
      {
        p: "Tell us about your property: where it is, what type it is, whether it is let now, and what you would like help with. We will explain how we would manage it and what it would cost, in writing, before you decide.",
      },
    ],
    faqs: [
      {
        q: "What does your property management service include?",
        a: "Lettings, rent collection, maintenance and repairs, tenant care, and regular updates with records and receipts.",
      },
      {
        q: "I live abroad. How will I know what is happening?",
        a: "You get regular updates with photos and videos, receipts for money received and spent, and we ask for your approval before major spending.",
      },
      {
        q: "How much does property management cost?",
        a: "It depends on the property and what you need. We explain the cost in writing before you decide — ask us with the form on this page or on WhatsApp.",
      },
      {
        q: "Can you find tenants for my property?",
        a: "Yes. Lettings are part of our service, with clear written terms agreed with every tenant.",
      },
    ],
    relatedPosts: ["building-lagos-development-guide", "buying-house-lagos-guide"],
    ctaHeading: "Let us look after your property",
    ctaText:
      "Tell us where it is and what you need. We will explain how we would manage it and what it costs, in writing.",
  },
] as const satisfies readonly LandingPage[];

export type LandingPath = (typeof LANDING_PAGES)[number]["path"];

export const LANDING_PATHS: readonly string[] = LANDING_PAGES.map((p) => p.path);

export function getLandingPage(path: string): LandingPage {
  const page = LANDING_PAGES.find((p) => p.path === path);
  if (!page) throw new Error(`No landing page for ${path}`);
  return page;
}

/** Landing pages that link to this blog post (shown at the end of the post). */
export function landingPagesForPost(slug: string): LandingPage[] {
  return LANDING_PAGES.filter((p) => (p.relatedPosts as readonly string[]).includes(slug));
}

/** Words in the intro and body (FAQ and "Why Verity" not counted). */
export function landingWordCount(page: LandingPage): number {
  const text = [
    page.intro,
    ...page.body.map((b) => ("h2" in b ? b.h2 : "p" in b ? b.p : b.ul.join(" "))),
  ].join(" ");
  return text.split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length;
}

/** Short names for "Popular searches" (footer) and the home services links. */
export const LANDING_LINKS = [
  { href: "/buy-house-lagos", label: "Buy a house in Lagos" },
  { href: "/land-for-sale-lagos", label: "Land for sale in Lagos" },
  { href: "/property-investment-lagos", label: "Property investment in Lagos" },
  { href: "/rent-apartment-lagos", label: "Apartments for rent in Lagos" },
  { href: "/property-management-lagos", label: "Property management in Lagos" },
] as const;
