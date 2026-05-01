export type SubjectKey =
  | "quantitative"
  | "verbal"
  | "math"
  | "physics"
  | "chemistry"
  | "biology";

export type ParentExam = "qudrat" | "tahsili";

export type QuestionType = {
  title: string;
  desc: string;
  iconKey: IconKey;
};

export type IconKey =
  | "calc"
  | "shapes"
  | "ratio"
  | "stats"
  | "link"
  | "book"
  | "abc"
  | "blank"
  | "equation"
  | "geometry"
  | "probability"
  | "trig"
  | "newton"
  | "bolt"
  | "wave"
  | "thermo"
  | "table"
  | "balance"
  | "beaker"
  | "molecule"
  | "cell"
  | "dna"
  | "anatomy"
  | "leaf";

export type Subject = {
  key: SubjectKey;
  parent: ParentExam;
  parentLabel: string; // e.g. "القدرات", "التحصيلي"
  parentHref: string; // e.g. "/qudrat", "/tahsili"
  nameAr: string;
  iconKey: IconKey;
  description: string;
  stats: { label: string; value: string }[];
  types: QuestionType[];
  methods: { title: string; desc: string }[];
  example: {
    question: string;
    options?: string[];
    solution: string[];
    methodHighlight: string;
  };
  focusHref: string; // /practice?focus=...
};

export const SUBJECTS: Record<SubjectKey, Subject> = {
  quantitative: {
    key: "quantitative",
    parent: "qudrat",
    parentLabel: "القدرات",
    parentHref: "/qudrat",
    nameAr: "الكمي",
    iconKey: "calc",
    description: "قسم الكمي يقيس قدرتك على حل المسائل الرياضية والمنطقية.",
    stats: [
      { label: "عدد الأسئلة", value: "+1500 سؤال" },
      { label: "متوسط الوقت", value: "72 ثانية / سؤال" },
      { label: "مستوى الصعوبة", value: "متوسط" },
    ],
    types: [
      { title: "الجبر", desc: "معادلات ومتغيرات.", iconKey: "equation" },
      { title: "الهندسة", desc: "أشكال ومساحات وزوايا.", iconKey: "shapes" },
      { title: "النسب والتناسب", desc: "العلاقات بين الأعداد.", iconKey: "ratio" },
      { title: "الإحصاء", desc: "المتوسطات والاحتمالات.", iconKey: "stats" },
    ],
    methods: [
      { title: "اقرأ السؤال واستخرج المعطيات أولاً", desc: "حدد ما هو معلوم وما هو مطلوب قبل البدء بالحل." },
      { title: "في النسب استخدم الضرب التبادلي", desc: "أسرع طريقة لحل مسائل التناسب المباشر." },
      { title: "في الهندسة ارسم الشكل دائماً", desc: "الرسم يكشف العلاقات الخفية بين الأطوال والزوايا." },
      { title: "في المعادلات عوّض بالأرقام إذا تعقّدت", desc: "جرّب أرقاماً صغيرة من الخيارات لتجد الإجابة بسرعة." },
      { title: "استبعد الخيارات البعيدة أولاً", desc: "تقدير سريع للناتج يقلل الخيارات إلى اثنين أو ثلاثة." },
    ],
    example: {
      question: "إذا كانت نسبة أ إلى ب هي 3:5، وكان مجموعهما 40، فما قيمة أ؟",
      solution: [
        "المجموع = 40، النسبة 3:5 أي الكل 8 أجزاء.",
        "قيمة الجزء = 40 ÷ 8 = 5.",
        "أ = 3 × 5 = 15.",
      ],
      methodHighlight: "تقسيم الكل على مجموع أجزاء النسبة لإيجاد قيمة الجزء الواحد ثم الضرب.",
    },
    focusHref: "/practice?focus=quantitative_ar",
  },

  verbal: {
    key: "verbal",
    parent: "qudrat",
    parentLabel: "القدرات",
    parentHref: "/qudrat",
    nameAr: "اللفظي",
    iconKey: "abc",
    description: "قسم اللفظي يقيس قدرتك اللغوية والاستيعابية.",
    stats: [
      { label: "عدد الأسئلة", value: "+1200 سؤال" },
      { label: "متوسط الوقت", value: "60 ثانية / سؤال" },
      { label: "مستوى الصعوبة", value: "متوسط" },
    ],
    types: [
      { title: "التناظر اللفظي", desc: "العلاقة بين الكلمات.", iconKey: "link" },
      { title: "استيعاب المقروء", desc: "فهم النصوص.", iconKey: "book" },
      { title: "المفردات", desc: "معاني الكلمات وأضدادها.", iconKey: "abc" },
      { title: "إكمال الجملة", desc: "السياق اللغوي.", iconKey: "blank" },
    ],
    methods: [
      { title: "في التناظر حدد العلاقة بين الكلمتين أولاً", desc: "ضع الكلمتين في جملة قصيرة لاكتشاف العلاقة." },
      { title: "في المقروء اقرأ السؤال قبل النص", desc: "يساعدك على التركيز فقط على المعلومة المطلوبة." },
      { title: "في المفردات استخدم الجذر اللغوي", desc: "الجذر يكشف معنى الكلمة حتى لو لم تكن تعرفها." },
      { title: "استبعد الخيار الشاذ أو البعيد", desc: "بعض الخيارات تكون خارج السياق تماماً، احذفها أولاً." },
      { title: "لا تقضِ أكثر من دقيقتين في سؤال واحد", desc: "علّم السؤال وارجع إليه إذا تبقّى وقت." },
    ],
    example: {
      question: "قلم : كتابة :: مشرط : ؟",
      options: ["أ) جراحة", "ب) مطبخ", "ج) رسم", "د) بناء"],
      solution: [
        "العلاقة: الأداة واستخدامها.",
        "القلم أداة للكتابة.",
        "المشرط أداة للجراحة.",
        "الإجابة: أ) جراحة.",
      ],
      methodHighlight: "تحديد العلاقة بين الكلمتين الأوليين ثم تطبيقها على الزوج الثاني.",
    },
    focusHref: "/practice?focus=verbal_ar",
  },

  math: {
    key: "math",
    parent: "tahsili",
    parentLabel: "التحصيلي",
    parentHref: "/tahsili",
    nameAr: "الرياضيات",
    iconKey: "calc",
    description: "رياضيات التحصيلي تشمل الجبر والهندسة والإحصاء والتفاضل.",
    stats: [
      { label: "عدد الأسئلة", value: "+1800 سؤال" },
      { label: "متوسط الوقت", value: "90 ثانية / سؤال" },
      { label: "مستوى الصعوبة", value: "متقدم" },
    ],
    types: [
      { title: "الجبر والمعادلات", desc: "معادلات من الدرجة الأولى والثانية.", iconKey: "equation" },
      { title: "الهندسة التحليلية", desc: "النقاط والمستقيمات والمنحنيات.", iconKey: "geometry" },
      { title: "الإحصاء والاحتمالات", desc: "المتوسطات والتشتت والاحتمال.", iconKey: "probability" },
      { title: "حساب المثلثات", desc: "الجيب والجيب تمام والظل.", iconKey: "trig" },
    ],
    methods: [
      { title: "احفظ القوانين الأساسية جيداً", desc: "القوانين هي أدواتك الأسرع، يجب أن تكون حاضرة فوراً." },
      { title: "في المعادلات التربيعية استخدم المميز أولاً", desc: "المميز يخبرك بعدد الحلول قبل البدء بالتعويض." },
      { title: "في الهندسة ارسم المسألة", desc: "الرسم يحوّل المعطيات إلى علاقات مرئية واضحة." },
      { title: "في الاحتمالات فكر في الحالات الكلية", desc: "ابدأ بإيجاد عدد الحالات الكلية ثم الحالات المطلوبة." },
      { title: "تحقق من الوحدات في المسائل التطبيقية", desc: "الوحدات تكشف الأخطاء قبل تسليم الإجابة." },
    ],
    example: {
      question: "حل المعادلة: س² − 5س + 6 = 0",
      solution: [
        "المميز = (−5)² − 4 × 1 × 6 = 25 − 24 = 1.",
        "س = (5 ± 1) ÷ 2.",
        "س = 3 أو س = 2.",
      ],
      methodHighlight: "حساب المميز أولاً يحدد عدد الحلول ثم تعويض القانون العام.",
    },
    focusHref: "/practice?focus=math_ar",
  },

  physics: {
    key: "physics",
    parent: "tahsili",
    parentLabel: "التحصيلي",
    parentHref: "/tahsili",
    nameAr: "الفيزياء",
    iconKey: "newton",
    description: "فيزياء التحصيلي تغطي الميكانيكا والكهرباء والموجات والحرارة.",
    stats: [
      { label: "عدد الأسئلة", value: "+1400 سؤال" },
      { label: "متوسط الوقت", value: "85 ثانية / سؤال" },
      { label: "مستوى الصعوبة", value: "متقدم" },
    ],
    types: [
      { title: "قوانين نيوتن والحركة", desc: "القوة والتسارع والكتلة.", iconKey: "newton" },
      { title: "الكهرباء والمغناطيسية", desc: "التيار والجهد والمقاومة.", iconKey: "bolt" },
      { title: "الموجات والصوت والضوء", desc: "الطول الموجي والتردد.", iconKey: "wave" },
      { title: "الحرارة والديناميكا", desc: "الطاقة والشغل والكفاءة.", iconKey: "thermo" },
    ],
    methods: [
      { title: "ارسم مخطط القوى في مسائل الحركة", desc: "كل قوة تُرسم كسهم بطول واتجاه واضحين." },
      { title: "تذكر القانون الأساسي: ق = ك × ت", desc: "علاقة القوة بالكتلة والتسارع هي محور أغلب الأسئلة." },
      { title: "في الكهرباء طبق قانون أوم أولاً", desc: "ج = ت × م تحل ثلث أسئلة الكهرباء مباشرة." },
      { title: "تحقق من الوحدات دائماً", desc: "نيوتن = كجم·م/ث²، فولت = أمبير × أوم — الوحدات لا تكذب." },
      { title: "في الموجات: السرعة = التردد × الطول الموجي", desc: "ع = ت × λ يربط ثلاث كميات في معادلة واحدة." },
    ],
    example: {
      question: "جسم كتلته 10 كجم يتحرك بتسارع 5 م/ث²، ما القوة المؤثرة عليه؟",
      solution: [
        "القانون: ق = ك × ت.",
        "ق = 10 × 5 = 50 نيوتن.",
      ],
      methodHighlight: "تطبيق مباشر لقانون نيوتن الثاني مع التحقق من الوحدات.",
    },
    focusHref: "/practice?focus=physics_ar",
  },

  chemistry: {
    key: "chemistry",
    parent: "tahsili",
    parentLabel: "التحصيلي",
    parentHref: "/tahsili",
    nameAr: "الكيمياء",
    iconKey: "beaker",
    description: "كيمياء التحصيلي تشمل الكيمياء العامة والعضوية وغير العضوية.",
    stats: [
      { label: "عدد الأسئلة", value: "+1300 سؤال" },
      { label: "متوسط الوقت", value: "80 ثانية / سؤال" },
      { label: "مستوى الصعوبة", value: "متقدم" },
    ],
    types: [
      { title: "الجدول الدوري والعناصر", desc: "الدورات والمجموعات والخواص.", iconKey: "table" },
      { title: "المعادلات الكيميائية", desc: "الموازنة وأنواع التفاعلات.", iconKey: "balance" },
      { title: "المحاليل والتفاعلات", desc: "التراكيز والذوبان والتركيب.", iconKey: "beaker" },
      { title: "الكيمياء العضوية", desc: "الألكانات والألكينات والمجموعات الوظيفية.", iconKey: "molecule" },
    ],
    methods: [
      { title: "احفظ الجدول الدوري جيداً", desc: "الدورات والمجموعات تكشف خواص أي عنصر مباشرة." },
      { title: "في الموازنة ابدأ بالعنصر الأقل تكراراً", desc: "غالباً ما يكون الفلز أو العنصر النادر." },
      { title: "في المحاليل تذكر: م = ن ÷ ح", desc: "المولارية = عدد المولات ÷ الحجم باللتر." },
      { title: "في التفاعلات حدد نوع التفاعل أولاً", desc: "اتحاد، انحلال، إحلال، تبادل — كل نوع له نمط مختلف." },
      { title: "احفظ التكافؤات الشائعة", desc: "تكافؤات العناصر الرئيسية تختصر زمن الموازنة كثيراً." },
    ],
    example: {
      question: "ما عدد مولات 36 جرام من الماء؟ (الكتلة المولية للماء = 18 جم/مول)",
      solution: [
        "عدد المولات = الكتلة ÷ الكتلة المولية.",
        "= 36 ÷ 18 = 2 مول.",
      ],
      methodHighlight: "تطبيق مباشر لعلاقة الكتلة بعدد المولات.",
    },
    focusHref: "/practice?focus=chemistry_ar",
  },

  biology: {
    key: "biology",
    parent: "tahsili",
    parentLabel: "التحصيلي",
    parentHref: "/tahsili",
    nameAr: "الأحياء",
    iconKey: "leaf",
    description: "أحياء التحصيلي تغطي الخلية والوراثة والتشريح والبيئة.",
    stats: [
      { label: "عدد الأسئلة", value: "+1100 سؤال" },
      { label: "متوسط الوقت", value: "75 ثانية / سؤال" },
      { label: "مستوى الصعوبة", value: "متوسط" },
    ],
    types: [
      { title: "الخلية ومكوناتها", desc: "العضيات ووظائفها.", iconKey: "cell" },
      { title: "الوراثة والجينات", desc: "قوانين مندل ومربع بانيت.", iconKey: "dna" },
      { title: "أجهزة جسم الإنسان", desc: "الدوري والتنفسي والعصبي.", iconKey: "anatomy" },
      { title: "البيئة والنظام البيئي", desc: "السلاسل والشبكات الغذائية.", iconKey: "leaf" },
    ],
    methods: [
      { title: "افهم المفهوم ولا تحفظ فقط", desc: "الفهم يجعلك تجيب حتى عن الأسئلة المصاغة بطريقة جديدة." },
      { title: "في الوراثة ارسم مربع بانيت", desc: "أسرع طريقة لحساب نسب الأبناء وراثياً." },
      { title: "في أجهزة الجسم اربط الوظيفة بالتركيب", desc: "كل عضو شكله يخدم وظيفته — هذا يثبّت المعلومة." },
      { title: "في البيئة تذكر سلاسل الغذاء", desc: "المنتج → المستهلك الأول → المستهلك الثاني → المحلل." },
      { title: "راجع المصطلحات العلمية باستمرار", desc: "أغلب أسئلة الأحياء تختبر دقة المصطلح." },
    ],
    example: {
      question: "خلية بها 46 كروموسوم خضعت للانقسام الميتوزي، كم عدد كروموسومات الخلايا الناتجة؟",
      solution: [
        "الانقسام الميتوزي ينتج خلايا متطابقة للخلية الأم.",
        "إذن عدد الكروموسومات في كل خلية ناتجة = 46 كروموسوم.",
      ],
      methodHighlight: "تذكّر أن الميتوزي يحافظ على عدد الكروموسومات (بعكس الميوزي الذي ينصّفها).",
    },
    focusHref: "/practice?focus=biology_ar",
  },
};
