// ============================================
// RAJASTHAN PYQ MASTER
// EXAM, SUBJECT, TOPIC & SUBTOPIC DATABASE
// File: src/exam-data.js
// ============================================

// भाषा के अनुसार नाम प्राप्त करना
export function getName(item, language = "hi") {
    return language === "en"
        ? item.en
        : item.hi;
}

// ============================================
// SUBJECT DATABASE
// ============================================

export const SUBJECTS = [

    {
        id: "rajasthan-gk",
        hi: "राजस्थान सामान्य ज्ञान",
        en: "Rajasthan General Knowledge",
        icon: "🏰",
        topics: [
            {
                id: "history",
                hi: "राजस्थान का इतिहास",
                en: "History of Rajasthan",
                subtopics: [
                    { id: "ancient-history", hi: "प्राचीन इतिहास", en: "Ancient History" },
                    { id: "medieval-history", hi: "मध्यकालीन इतिहास", en: "Medieval History" },
                    { id: "modern-history", hi: "आधुनिक इतिहास", en: "Modern History" },
                    { id: "rajput-dynasties", hi: "राजपूत वंश", en: "Rajput Dynasties" },
                    { id: "freedom-movement", hi: "स्वतंत्रता आंदोलन", en: "Freedom Movement" },
                    { id: "historical-battles", hi: "प्रमुख युद्ध एवं संधियाँ", en: "Major Battles and Treaties" },
                    { id: "historical-personalities", hi: "प्रमुख ऐतिहासिक व्यक्तित्व", en: "Historical Personalities" }
                ]
            },
            {
                id: "geography",
                hi: "राजस्थान का भूगोल",
                en: "Geography of Rajasthan",
                subtopics: [
                    { id: "location", hi: "स्थिति एवं विस्तार", en: "Location and Extent" },
                    { id: "physical-divisions", hi: "भौतिक विभाग", en: "Physical Divisions" },
                    { id: "rivers", hi: "नदियाँ एवं झीलें", en: "Rivers and Lakes" },
                    { id: "climate", hi: "जलवायु", en: "Climate" },
                    { id: "soil", hi: "मृदा", en: "Soil" },
                    { id: "forests", hi: "वन एवं वन्यजीव", en: "Forests and Wildlife" },
                    { id: "minerals", hi: "खनिज संसाधन", en: "Mineral Resources" },
                    { id: "agriculture", hi: "कृषि एवं सिंचाई", en: "Agriculture and Irrigation" },
                    { id: "dams", hi: "बाँध एवं परियोजनाएँ", en: "Dams and Projects" },
                    { id: "districts", hi: "जिले एवं संभाग", en: "Districts and Divisions" }
                ]
            },
            {
                id: "culture",
                hi: "राजस्थान की कला एवं संस्कृति",
                en: "Art and Culture of Rajasthan",
                subtopics: [
                    { id: "folk-dance", hi: "लोक नृत्य", en: "Folk Dances" },
                    { id: "folk-music", hi: "लोक संगीत", en: "Folk Music" },
                    { id: "folk-instruments", hi: "लोक वाद्य यंत्र", en: "Folk Instruments" },
                    { id: "folk-deities", hi: "लोक देवता एवं देवियाँ", en: "Folk Deities" },
                    { id: "fairs", hi: "मेले एवं त्योहार", en: "Fairs and Festivals" },
                    { id: "painting", hi: "चित्रकला शैलियाँ", en: "Painting Styles" },
                    { id: "handicrafts", hi: "हस्तशिल्प", en: "Handicrafts" },
                    { id: "architecture", hi: "स्थापत्य कला", en: "Architecture" },
                    { id: "costumes", hi: "वेशभूषा एवं आभूषण", en: "Costumes and Jewellery" },
                    { id: "languages", hi: "बोलियाँ एवं साहित्य", en: "Dialects and Literature" }
                ]
            },
            {
                id: "polity",
                hi: "राजस्थान की राजव्यवस्था",
                en: "Rajasthan Polity",
                subtopics: [
                    { id: "governor", hi: "राज्यपाल", en: "Governor" },
                    { id: "chief-minister", hi: "मुख्यमंत्री एवं मंत्रिपरिषद", en: "Chief Minister and Council" },
                    { id: "assembly", hi: "विधानसभा", en: "Legislative Assembly" },
                    { id: "high-court", hi: "उच्च न्यायालय", en: "High Court" },
                    { id: "local-government", hi: "पंचायती राज", en: "Panchayati Raj" },
                    { id: "municipalities", hi: "नगरपालिका व्यवस्था", en: "Municipal System" },
                    { id: "administration", hi: "प्रशासनिक व्यवस्था", en: "Administrative System" }
                ]
            },
            {
                id: "economy",
                hi: "राजस्थान की अर्थव्यवस्था",
                en: "Economy of Rajasthan",
                subtopics: [
                    { id: "industries", hi: "उद्योग", en: "Industries" },
                    { id: "agricultural-economy", hi: "कृषि अर्थव्यवस्था", en: "Agricultural Economy" },
                    { id: "tourism", hi: "पर्यटन", en: "Tourism" },
                    { id: "budget", hi: "राज्य बजट", en: "State Budget" },
                    { id: "schemes", hi: "राज्य सरकारी योजनाएँ", en: "Government Schemes" },
                    { id: "census", hi: "जनगणना एवं आर्थिक आँकड़े", en: "Census and Economic Data" }
                ]
            }
        ]
    },

    {
        id: "indian-history",
        hi: "भारतीय इतिहास",
        en: "Indian History",
        icon: "📜",
        topics: [
            {
                id: "ancient-india",
                hi: "प्राचीन भारत",
                en: "Ancient India",
                subtopics: [
                    { id: "indus-valley", hi: "सिंधु घाटी सभ्यता", en: "Indus Valley Civilization" },
                    { id: "vedic-period", hi: "वैदिक काल", en: "Vedic Period" },
                    { id: "mahajanapadas", hi: "महाजनपद", en: "Mahajanapadas" },
                    { id: "buddhism", hi: "बौद्ध धर्म", en: "Buddhism" },
                    { id: "jainism", hi: "जैन धर्म", en: "Jainism" },
                    { id: "maurya", hi: "मौर्य साम्राज्य", en: "Maurya Empire" },
                    { id: "gupta", hi: "गुप्त साम्राज्य", en: "Gupta Empire" }
                ]
            },
            {
                id: "medieval-india",
                hi: "मध्यकालीन भारत",
                en: "Medieval India",
                subtopics: [
                    { id: "delhi-sultanate", hi: "दिल्ली सल्तनत", en: "Delhi Sultanate" },
                    { id: "mughal", hi: "मुगल साम्राज्य", en: "Mughal Empire" },
                    { id: "bhakti", hi: "भक्ति आंदोलन", en: "Bhakti Movement" },
                    { id: "sufi", hi: "सूफी आंदोलन", en: "Sufi Movement" },
                    { id: "maratha", hi: "मराठा साम्राज्य", en: "Maratha Empire" }
                ]
            },
            {
                id: "modern-india",
                hi: "आधुनिक भारत",
                en: "Modern India",
                subtopics: [
                    { id: "europeans", hi: "यूरोपीय कंपनियों का आगमन", en: "Arrival of Europeans" },
                    { id: "british-rule", hi: "ब्रिटिश शासन", en: "British Rule" },
                    { id: "revolt-1857", hi: "1857 की क्रांति", en: "Revolt of 1857" },
                    { id: "social-reforms", hi: "सामाजिक एवं धार्मिक सुधार", en: "Social and Religious Reforms" },
                    { id: "national-movement", hi: "राष्ट्रीय आंदोलन", en: "National Movement" },
                    { id: "independence", hi: "स्वतंत्रता एवं विभाजन", en: "Independence and Partition" }
                ]
            }
        ]
    },

    {
        id: "indian-geography",
        hi: "भारतीय भूगोल",
        en: "Indian Geography",
        icon: "🌍",
        topics: [
            {
                id: "physical-geography",
                hi: "भौतिक भूगोल",
                en: "Physical Geography",
                subtopics: [
                    { id: "mountains", hi: "पर्वत एवं पठार", en: "Mountains and Plateaus" },
                    { id: "plains", hi: "मैदान", en: "Plains" },
                    { id: "rivers-india", hi: "भारत की नदियाँ", en: "Indian Rivers" },
                    { id: "climate-india", hi: "जलवायु एवं मानसून", en: "Climate and Monsoon" },
                    { id: "soil-india", hi: "मृदा", en: "Soils" }
                ]
            },
            {
                id: "economic-geography",
                hi: "आर्थिक भूगोल",
                en: "Economic Geography",
                subtopics: [
                    { id: "agriculture-india", hi: "कृषि", en: "Agriculture" },
                    { id: "minerals-india", hi: "खनिज", en: "Minerals" },
                    { id: "industries-india", hi: "उद्योग", en: "Industries" },
                    { id: "transport-india", hi: "परिवहन", en: "Transport" }
                ]
            },
            {
                id: "world-geography",
                hi: "विश्व भूगोल",
                en: "World Geography",
                subtopics: [
                    { id: "continents", hi: "महाद्वीप", en: "Continents" },
                    { id: "oceans", hi: "महासागर", en: "Oceans" },
                    { id: "countries-capitals", hi: "देश एवं राजधानियाँ", en: "Countries and Capitals" },
                    { id: "world-climate", hi: "विश्व की जलवायु", en: "World Climate" }
                ]
            }
        ]
    },

    {
        id: "indian-polity",
        hi: "भारतीय संविधान एवं राजव्यवस्था",
        en: "Indian Constitution and Polity",
        icon: "⚖️",
        topics: [
            {
                id: "constitution",
                hi: "भारतीय संविधान",
                en: "Indian Constitution",
                subtopics: [
                    { id: "preamble", hi: "प्रस्तावना", en: "Preamble" },
                    { id: "features", hi: "संविधान की विशेषताएँ", en: "Features of Constitution" },
                    { id: "fundamental-rights", hi: "मौलिक अधिकार", en: "Fundamental Rights" },
                    { id: "duties", hi: "मौलिक कर्तव्य", en: "Fundamental Duties" },
                    { id: "dpsp", hi: "राज्य के नीति निर्देशक तत्व", en: "Directive Principles" },
                    { id: "amendments", hi: "संविधान संशोधन", en: "Constitutional Amendments" }
                ]
            },
            {
                id: "central-government",
                hi: "केंद्र सरकार",
                en: "Central Government",
                subtopics: [
                    { id: "president", hi: "राष्ट्रपति", en: "President" },
                    { id: "vice-president", hi: "उपराष्ट्रपति", en: "Vice President" },
                    { id: "prime-minister", hi: "प्रधानमंत्री", en: "Prime Minister" },
                    { id: "parliament", hi: "संसद", en: "Parliament" },
                    { id: "supreme-court", hi: "सर्वोच्च न्यायालय", en: "Supreme Court" }
                ]
            },
            {
                id: "federal-system",
                hi: "संघीय व्यवस्था",
                en: "Federal System",
                subtopics: [
                    { id: "centre-state", hi: "केंद्र-राज्य संबंध", en: "Centre-State Relations" },
                    { id: "emergency", hi: "आपातकालीन प्रावधान", en: "Emergency Provisions" },
                    { id: "election", hi: "निर्वाचन आयोग", en: "Election Commission" },
                    { id: "constitutional-bodies", hi: "संवैधानिक संस्थाएँ", en: "Constitutional Bodies" }
                ]
            }
        ]
    },

    {
        id: "general-science",
        hi: "सामान्य विज्ञान",
        en: "General Science",
        icon: "🔬",
        topics: [
            {
                id: "physics",
                hi: "भौतिक विज्ञान",
                en: "Physics",
                subtopics: [
                    { id: "motion", hi: "गति एवं बल", en: "Motion and Force" },
                    { id: "work-energy", hi: "कार्य, ऊर्जा एवं शक्ति", en: "Work, Energy and Power" },
                    { id: "light", hi: "प्रकाश", en: "Light" },
                    { id: "sound", hi: "ध्वनि", en: "Sound" },
                    { id: "electricity", hi: "विद्युत", en: "Electricity" },
                    { id: "heat", hi: "ऊष्मा", en: "Heat" }
                ]
            },
            {
                id: "chemistry",
                hi: "रसायन विज्ञान",
                en: "Chemistry",
                subtopics: [
                    { id: "matter", hi: "पदार्थ", en: "Matter" },
                    { id: "atom", hi: "परमाणु एवं अणु", en: "Atoms and Molecules" },
                    { id: "elements", hi: "तत्व एवं यौगिक", en: "Elements and Compounds" },
                    { id: "acid-base", hi: "अम्ल, क्षार एवं लवण", en: "Acids, Bases and Salts" },
                    { id: "metals", hi: "धातु एवं अधातु", en: "Metals and Non-metals" }
                ]
            },
            {
                id: "biology",
                hi: "जीव विज्ञान",
                en: "Biology",
                subtopics: [
                    { id: "cell", hi: "कोशिका", en: "Cell" },
                    { id: "human-body", hi: "मानव शरीर", en: "Human Body" },
                    { id: "nutrition", hi: "पोषण", en: "Nutrition" },
                    { id: "diseases", hi: "रोग एवं स्वास्थ्य", en: "Diseases and Health" },
                    { id: "genetics", hi: "आनुवंशिकी", en: "Genetics" },
                    { id: "plant-biology", hi: "पादप विज्ञान", en: "Botany" }
                ]
            }
        ]
    },

    {
        id: "mathematics",
        hi: "गणित",
        en: "Mathematics",
        icon: "➗",
        topics: [
            {
                id: "arithmetic",
                hi: "अंकगणित",
                en: "Arithmetic",
                subtopics: [
                    { id: "number-system", hi: "संख्या पद्धति", en: "Number System" },
                    { id: "simplification", hi: "सरलीकरण", en: "Simplification" },
                    { id: "percentage", hi: "प्रतिशत", en: "Percentage" },
                    { id: "profit-loss", hi: "लाभ एवं हानि", en: "Profit and Loss" },
                    { id: "simple-interest", hi: "साधारण ब्याज", en: "Simple Interest" },
                    { id: "compound-interest", hi: "चक्रवृद्धि ब्याज", en: "Compound Interest" },
                    { id: "ratio", hi: "अनुपात एवं समानुपात", en: "Ratio and Proportion" },
                    { id: "average", hi: "औसत", en: "Average" },
                    { id: "time-work", hi: "समय एवं कार्य", en: "Time and Work" },
                    { id: "time-distance", hi: "समय, चाल एवं दूरी", en: "Time, Speed and Distance" }
                ]
            },
            {
                id: "algebra",
                hi: "बीजगणित",
                en: "Algebra",
                subtopics: [
                    { id: "identities", hi: "बीजीय सर्वसमिकाएँ", en: "Algebraic Identities" },
                    { id: "equations", hi: "समीकरण", en: "Equations" },
                    { id: "polynomials", hi: "बहुपद", en: "Polynomials" }
                ]
            },
            {
                id: "geometry",
                hi: "ज्यामिति एवं क्षेत्रमिति",
                en: "Geometry and Mensuration",
                subtopics: [
                    { id: "lines-angles", hi: "रेखाएँ एवं कोण", en: "Lines and Angles" },
                    { id: "triangles", hi: "त्रिभुज", en: "Triangles" },
                    { id: "circles", hi: "वृत्त", en: "Circles" },
                    { id: "2d-mensuration", hi: "समतल क्षेत्रमिति", en: "2D Mensuration" },
                    { id: "3d-mensuration", hi: "ठोस क्षेत्रमिति", en: "3D Mensuration" }
                ]
            },
            {
                id: "statistics",
                hi: "सांख्यिकी",
                en: "Statistics",
                subtopics: [
                    { id: "data-interpretation", hi: "आँकड़ों का विश्लेषण", en: "Data Interpretation" },
                    { id: "mean-median-mode", hi: "माध्य, माध्यिका एवं बहुलक", en: "Mean, Median and Mode" },
                    { id: "probability", hi: "प्रायिकता", en: "Probability" }
                ]
            }
        ]
    },

    {
        id: "reasoning",
        hi: "तार्किक योग्यता",
        en: "Reasoning Ability",
        icon: "🧠",
        topics: [
            {
                id: "verbal-reasoning",
                hi: "शाब्दिक तर्कशक्ति",
                en: "Verbal Reasoning",
                subtopics: [
                    { id: "analogy", hi: "सादृश्यता", en: "Analogy" },
                    { id: "classification", hi: "वर्गीकरण", en: "Classification" },
                    { id: "series", hi: "श्रृंखला", en: "Series" },
                    { id: "coding-decoding", hi: "कूटलेखन एवं कूटवाचन", en: "Coding-Decoding" },
                    { id: "blood-relations", hi: "रक्त संबंध", en: "Blood Relations" },
                    { id: "direction", hi: "दिशा एवं दूरी", en: "Direction and Distance" },
                    { id: "ranking", hi: "क्रम व्यवस्था", en: "Ranking" },
                    { id: "syllogism", hi: "न्यायवाक्य", en: "Syllogism" }
                ]
            },
            {
                id: "non-verbal-reasoning",
                hi: "अशाब्दिक तर्कशक्ति",
                en: "Non-Verbal Reasoning",
                subtopics: [
                    { id: "figure-series", hi: "आकृति श्रृंखला", en: "Figure Series" },
                    { id: "mirror-image", hi: "दर्पण प्रतिबिंब", en: "Mirror Image" },
                    { id: "water-image", hi: "जल प्रतिबिंब", en: "Water Image" },
                    { id: "paper-folding", hi: "कागज मोड़ना", en: "Paper Folding" },
                    { id: "embedded-figures", hi: "अंतर्निहित आकृतियाँ", en: "Embedded Figures" }
                ]
            }
        ]
    },

    {
        id: "hindi",
        hi: "हिंदी भाषा",
        en: "Hindi Language",
        icon: "🔤",
        topics: [
            {
                id: "hindi-grammar",
                hi: "हिंदी व्याकरण",
                en: "Hindi Grammar",
                subtopics: [
                    { id: "sangya", hi: "संज्ञा", en: "Noun" },
                    { id: "sarvanam", hi: "सर्वनाम", en: "Pronoun" },
                    { id: "visheshan", hi: "विशेषण", en: "Adjective" },
                    { id: "kriya", hi: "क्रिया", en: "Verb" },
                    { id: "sandhi", hi: "संधि", en: "Sandhi" },
                    { id: "samas", hi: "समास", en: "Samas" },
                    { id: "upsarg-pratyay", hi: "उपसर्ग एवं प्रत्यय", en: "Prefixes and Suffixes" },
                    { id: "muhavare", hi: "मुहावरे एवं लोकोक्तियाँ", en: "Idioms and Proverbs" },
                    { id: "paryayvachi", hi: "पर्यायवाची शब्द", en: "Synonyms" },
                    { id: "vilom", hi: "विलोम शब्द", en: "Antonyms" },
                    { id: "vakya-shuddhi", hi: "वाक्य शुद्धि", en: "Sentence Correction" }
                ]
            },
            {
                id: "hindi-literature",
                hi: "हिंदी साहित्य",
                en: "Hindi Literature",
                subtopics: [
                    { id: "ras", hi: "रस", en: "Rasa" },
                    { id: "chhand", hi: "छंद", en: "Chhand" },
                    { id: "alankar", hi: "अलंकार", en: "Figures of Speech" },
                    { id: "writers", hi: "प्रमुख लेखक एवं कवि", en: "Writers and Poets" },
                    { id: "literary-works", hi: "प्रमुख साहित्यिक रचनाएँ", en: "Literary Works" }
                ]
            }
        ]
    },

    {
        id: "english",
        hi: "अंग्रेजी भाषा",
        en: "English Language",
        icon: "📚",
        topics: [
            {
                id: "english-grammar",
                hi: "अंग्रेजी व्याकरण",
                en: "English Grammar",
                subtopics: [
                    { id: "parts-of-speech", hi: "Parts of Speech", en: "Parts of Speech" },
                    { id: "tenses", hi: "Tenses", en: "Tenses" },
                    { id: "articles", hi: "Articles", en: "Articles" },
                    { id: "prepositions", hi: "Prepositions", en: "Prepositions" },
                    { id: "voice", hi: "Active and Passive Voice", en: "Active and Passive Voice" },
                    { id: "narration", hi: "Direct and Indirect Speech", en: "Direct and Indirect Speech" },
                    { id: "subject-verb", hi: "Subject-Verb Agreement", en: "Subject-Verb Agreement" },
                    { id: "sentence-correction", hi: "Sentence Correction", en: "Sentence Correction" }
                ]
            },
            {
                id: "english-vocabulary",
                hi: "शब्दावली",
                en: "Vocabulary",
                subtopics: [
                    { id: "synonyms", hi: "Synonyms", en: "Synonyms" },
                    { id: "antonyms", hi: "Antonyms", en: "Antonyms" },
                    { id: "one-word", hi: "One Word Substitution", en: "One Word Substitution" },
                    { id: "idioms-phrases", hi: "Idioms and Phrases", en: "Idioms and Phrases" },
                    { id: "spelling", hi: "Spelling Correction", en: "Spelling Correction" }
                ]
            }
        ]
    },

    {
        id: "computer",
        hi: "कंप्यूटर ज्ञान",
        en: "Computer Knowledge",
        icon: "💻",
        topics: [
            {
                id: "computer-basics",
                hi: "कंप्यूटर की मूल जानकारी",
                en: "Computer Fundamentals",
                subtopics: [
                    { id: "generations", hi: "कंप्यूटर की पीढ़ियाँ", en: "Generations of Computers" },
                    { id: "hardware", hi: "हार्डवेयर", en: "Hardware" },
                    { id: "software", hi: "सॉफ्टवेयर", en: "Software" },
                    { id: "input-output", hi: "इनपुट एवं आउटपुट डिवाइस", en: "Input and Output Devices" },
                    { id: "memory", hi: "मेमोरी", en: "Memory" },
                    { id: "operating-system", hi: "ऑपरेटिंग सिस्टम", en: "Operating Systems" }
                ]
            },
            {
                id: "office",
                hi: "ऑफिस एप्लीकेशन",
                en: "Office Applications",
                subtopics: [
                    { id: "word", hi: "MS Word", en: "MS Word" },
                    { id: "excel", hi: "MS Excel", en: "MS Excel" },
                    { id: "powerpoint", hi: "MS PowerPoint", en: "MS PowerPoint" }
                ]
            },
            {
                id: "internet",
                hi: "इंटरनेट एवं नेटवर्किंग",
                en: "Internet and Networking",
                subtopics: [
                    { id: "internet-basics", hi: "इंटरनेट", en: "Internet" },
                    { id: "network-types", hi: "नेटवर्क के प्रकार", en: "Types of Networks" },
                    { id: "cyber-security", hi: "साइबर सुरक्षा", en: "Cyber Security" },
                    { id: "email", hi: "ई-मेल", en: "Email" },
                    { id: "digital-payments", hi: "डिजिटल भुगतान", en: "Digital Payments" }
                ]
            }
        ]
    },

    {
        id: "current-affairs",
        hi: "समसामयिकी",
        en: "Current Affairs",
        icon: "📰",
        topics: [
            {
                id: "national",
                hi: "राष्ट्रीय घटनाक्रम",
                en: "National Affairs",
                subtopics: [
                    { id: "national-news", hi: "राष्ट्रीय समाचार", en: "National News" },
                    { id: "national-awards", hi: "राष्ट्रीय पुरस्कार", en: "National Awards" },
                    { id: "appointments", hi: "प्रमुख नियुक्तियाँ", en: "Appointments" },
                    { id: "government-schemes", hi: "सरकारी योजनाएँ", en: "Government Schemes" }
                ]
            },
            {
                id: "international",
                hi: "अंतरराष्ट्रीय घटनाक्रम",
                en: "International Affairs",
                subtopics: [
                    { id: "international-news", hi: "अंतरराष्ट्रीय समाचार", en: "International News" },
                    { id: "summits", hi: "सम्मेलन एवं शिखर बैठकें", en: "Summits" },
                    { id: "organizations", hi: "अंतरराष्ट्रीय संगठन", en: "International Organizations" }
                ]
            },
            {
                id: "sports",
                hi: "खेलकूद",
                en: "Sports",
                subtopics: [
                    { id: "cricket", hi: "क्रिकेट", en: "Cricket" },
                    { id: "olympics", hi: "ओलंपिक एवं एशियाई खेल", en: "Olympics and Asian Games" },
                    { id: "tournaments", hi: "प्रमुख प्रतियोगिताएँ", en: "Major Tournaments" },
                    { id: "sports-awards", hi: "खेल पुरस्कार", en: "Sports Awards" }
                ]
            }
        ]
    },

    {
        id: "teaching",
        hi: "शिक्षण अभिरुचि एवं शिक्षा शास्त्र",
        en: "Teaching Aptitude and Pedagogy",
        icon: "👨‍🏫",
        topics: [
            {
                id: "child-development",
                hi: "बाल विकास",
                en: "Child Development",
                subtopics: [
                    { id: "growth-development", hi: "वृद्धि एवं विकास", en: "Growth and Development" },
                    { id: "learning", hi: "अधिगम", en: "Learning" },
                    { id: "motivation", hi: "अभिप्रेरणा", en: "Motivation" },
                    { id: "intelligence", hi: "बुद्धि एवं व्यक्तित्व", en: "Intelligence and Personality" }
                ]
            },
            {
                id: "pedagogy",
                hi: "शिक्षण विधियाँ",
                en: "Teaching Methods",
                subtopics: [
                    { id: "teaching-principles", hi: "शिक्षण के सिद्धांत", en: "Teaching Principles" },
                    { id: "teaching-methods", hi: "शिक्षण विधियाँ", en: "Teaching Methods" },
                    { id: "assessment", hi: "मूल्यांकन", en: "Assessment" },
                    { id: "inclusive-education", hi: "समावेशी शिक्षा", en: "Inclusive Education" }
                ]
            }
        ]
    },

    {
        id: "agriculture",
        hi: "कृषि विज्ञान",
        en: "Agriculture",
        icon: "🌾",
        topics: [
            {
                id: "agronomy",
                hi: "सस्य विज्ञान",
                en: "Agronomy",
                subtopics: [
                    { id: "crop-production", hi: "फसल उत्पादन", en: "Crop Production" },
                    { id: "irrigation", hi: "सिंचाई प्रबंधन", en: "Irrigation Management" },
                    { id: "soil-management", hi: "मृदा प्रबंधन", en: "Soil Management" }
                ]
            },
            {
                id: "horticulture",
                hi: "उद्यानिकी",
                en: "Horticulture",
                subtopics: [
                    { id: "fruits", hi: "फल उत्पादन", en: "Fruit Production" },
                    { id: "vegetables", hi: "सब्जी उत्पादन", en: "Vegetable Production" },
                    { id: "flowers", hi: "पुष्प उत्पादन", en: "Flower Production" }
                ]
            },
            {
                id: "animal-husbandry",
                hi: "पशुपालन",
                en: "Animal Husbandry",
                subtopics: [
                    { id: "dairy", hi: "डेयरी विज्ञान", en: "Dairy Science" },
                    { id: "livestock", hi: "पशुधन प्रबंधन", en: "Livestock Management" },
                    { id: "animal-diseases", hi: "पशु रोग", en: "Animal Diseases" }
                ]
            }
        ]
    }

];

// ============================================
// EXAM DATABASE
// ============================================

export const EXAMS = [

    {
        id: "cet-graduate",
        hi: "CET स्नातक स्तर",
        en: "CET Graduate Level",
        category: "CET",
        qualification: "Graduate",
        subjects: [
            "rajasthan-gk",
            "indian-history",
            "indian-geography",
            "indian-polity",
            "general-science",
            "mathematics",
            "reasoning",
            "hindi",
            "english",
            "computer",
            "current-affairs"
        ]
    },

    {
        id: "cet-12th",
        hi: "CET वरिष्ठ माध्यमिक स्तर",
        en: "CET Senior Secondary Level",
        category: "CET",
        qualification: "12th",
        subjects: [
            "rajasthan-gk",
            "indian-history",
            "indian-geography",
            "indian-polity",
            "general-science",
            "mathematics",
            "reasoning",
            "hindi",
            "english",
            "computer",
            "current-affairs"
        ]
    },

    {
        id: "patwari",
        hi: "पटवारी",
        en: "Patwari",
        category: "RSSB",
        subjects: [
            "rajasthan-gk",
            "indian-history",
            "indian-geography",
            "indian-polity",
            "general-science",
            "mathematics",
            "reasoning",
            "hindi",
            "english",
            "computer",
            "current-affairs"
        ]
    },

    {
        id: "vdo",
        hi: "ग्राम विकास अधिकारी (VDO)",
        en: "Village Development Officer",
        category: "RSSB",
        subjects: [
            "rajasthan-gk",
            "indian-history",
            "indian-geography",
            "indian-polity",
            "general-science",
            "mathematics",
            "reasoning",
            "hindi",
            "english",
            "computer",
            "current-affairs"
        ]
    },

    {
        id: "police-constable",
        hi: "राजस्थान पुलिस कांस्टेबल",
        en: "Rajasthan Police Constable",
        category: "Police",
        subjects: [
            "rajasthan-gk",
            "indian-history",
            "indian-geography",
            "indian-polity",
            "general-science",
            "reasoning",
            "current-affairs",
            "computer"
        ]
    },

    {
        id: "si",
        hi: "पुलिस सब इंस्पेक्टर (SI)",
        en: "Police Sub Inspector",
        category: "Police",
        subjects: [
            "rajasthan-gk",
            "indian-history",
            "indian-geography",
            "indian-polity",
            "general-science",
            "mathematics",
            "reasoning",
            "hindi",
            "current-affairs"
        ]
    },

    {
        id: "ldc",
        hi: "लिपिक ग्रेड-II (LDC)",
        en: "Lower Division Clerk",
        category: "RSSB",
        subjects: [
            "rajasthan-gk",
            "indian-history",
            "indian-geography",
            "indian-polity",
            "general-science",
            "mathematics",
            "reasoning",
            "hindi",
            "english",
            "computer"
        ]
    },

    {
        id: "reet",
        hi: "REET",
        en: "REET",
        category: "Teaching",
        subjects: [
            "rajasthan-gk",
            "indian-history",
            "indian-geography",
            "indian-polity",
            "general-science",
            "mathematics",
            "hindi",
            "english",
            "teaching"
        ]
    },

    {
        id: "rpsc",
        hi: "RPSC",
        en: "RPSC",
        category: "RPSC",
        subjects: [
            "rajasthan-gk",
            "indian-history",
            "indian-geography",
            "indian-polity",
            "general-science",
            "mathematics",
            "reasoning",
            "hindi",
            "english",
            "current-affairs"
        ]
    },

    {
        id: "junior-accountant",
        hi: "कनिष्ठ लेखाकार",
        en: "Junior Accountant",
        category: "RSSB",
        subjects: [
            "rajasthan-gk",
            "indian-polity",
            "mathematics",
            "reasoning",
            "computer",
            "current-affairs"
        ]
    },

    {
        id: "fourth-grade",
        hi: "चतुर्थ श्रेणी कर्मचारी",
        en: "Fourth Grade Employee",
        category: "RSSB",
        subjects: [
            "rajasthan-gk",
            "indian-history",
            "indian-geography",
            "indian-polity",
            "general-science",
            "mathematics",
            "reasoning",
            "hindi",
            "english",
            "current-affairs"
        ]
    }

];

// ============================================
// GET ALL EXAMS
// ============================================

export function getAllExams(language = "hi") {
    return EXAMS.map(exam => ({
        ...exam,
        name: getName(exam, language)
    }));
}

// ============================================
// GET EXAM BY ID
// ============================================

export function getExamById(examId) {
    return EXAMS.find(exam => exam.id === examId) || null;
}

// ============================================
// GET SUBJECTS FOR EXAM
// ============================================

export function getSubjectsByExam(examId, language = "hi") {
    const exam = getExamById(examId);

    if (!exam) return [];

    return exam.subjects
        .map(subjectId => {
            const subject = SUBJECTS.find(
                item => item.id === subjectId
            );

            if (!subject) return null;

            return {
                ...subject,
                name: getName(subject, language)
            };
        })
        .filter(Boolean);
}

// ============================================
// GET SUBJECT BY ID
// ============================================

export function getSubjectById(subjectId) {
    return SUBJECTS.find(
        subject => subject.id === subjectId
    ) || null;
}

// ============================================
// GET TOPICS BY SUBJECT
// ============================================

export function getTopicsBySubject(
    subjectId,
    language = "hi"
) {
    const subject = getSubjectById(subjectId);

    if (!subject) return [];

    return subject.topics.map(topic => ({
        ...topic,
        name: getName(topic, language)
    }));
}

// ============================================
// GET SUBTOPICS BY TOPIC
// ============================================

export function getSubtopicsByTopic(
    subjectId,
    topicId,
    language = "hi"
) {
    const subject = getSubjectById(subjectId);

    if (!subject) return [];

    const topic = subject.topics.find(
        item => item.id === topicId
    );

    if (!topic) return [];

    return topic.subtopics.map(subtopic => ({
        ...subtopic,
        name: getName(subtopic, language)
    }));
}

// ============================================
// GET COMPLETE SUBJECT HIERARCHY
// ============================================

export function getCompleteSubjectHierarchy(
    subjectId,
    language = "hi"
) {
    const subject = getSubjectById(subjectId);

    if (!subject) return null;

    return {
        id: subject.id,
        name: getName(subject, language),

        topics: subject.topics.map(topic => ({
            id: topic.id,
            name: getName(topic, language),

            subtopics: topic.subtopics.map(subtopic => ({
                id: subtopic.id,
                name: getName(subtopic, language)
            }))
        }))
    };
}

// ============================================
// SEARCH EXAMS
// ============================================

export function searchExams(searchText, language = "hi") {
    const search = String(searchText || "")
        .trim()
        .toLowerCase();

    if (!search) return getAllExams(language);

    return EXAMS.filter(exam => {
        const name = getName(exam, language).toLowerCase();

        return (
            name.includes(search) ||
            exam.id.toLowerCase().includes(search) ||
            exam.category.toLowerCase().includes(search)
        );
    });
}

// ============================================
// SEARCH SUBJECTS
// ============================================

export function searchSubjects(
    searchText,
    examId,
    language = "hi"
) {
    const search = String(searchText || "")
        .trim()
        .toLowerCase();

    return getSubjectsByExam(examId, language)
        .filter(subject => {
            if (!search) return true;

            return (
                subject.name.toLowerCase().includes(search) ||
                subject.id.toLowerCase().includes(search)
            );
        });
}

// ============================================
// GET TOTAL COUNTS
// ============================================

export function getExamDataCounts() {
    const totalSubjects = SUBJECTS.length;

    const totalTopics = SUBJECTS.reduce(
        (total, subject) => total + subject.topics.length,
        0
    );

    const totalSubtopics = SUBJECTS.reduce(
        (total, subject) => {
            return total + subject.topics.reduce(
                (topicTotal, topic) =>
                    topicTotal + topic.subtopics.length,
                0
            );
        },
        0
    );

    return {
        exams: EXAMS.length,
        subjects: totalSubjects,
        topics: totalTopics,
        subtopics: totalSubtopics
    };
}
