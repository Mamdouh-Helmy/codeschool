export type AboutLocale = "ar" | "en";

export interface Cta {
  label: string;
  href: string;
}

export interface Item {
  title: string;
  text: string;
}

export interface Segment {
  text: string;
  mark?: boolean;
}

export interface Stat {
  value: number;
  suffix: string;
  label: string;
}

export interface Milestone extends Item {
  year: string;
}

export interface AboutContent {
  hero: {
    hat: string;
    lines: string[];
    bubble: string;
    subtitle: string;
    run: string;
    replay: string;
    primaryCta: Cta;
  };
  story: { title: string; segments: Segment[]; mission: Item; vision: Item };
  stats: { title: string; items: Stat[] };
  principles: { title: string; items: Item[] };
  journey: { title: string; items: Milestone[] };
  cta: { hat: string; title: string; text: string; href: string };
}

// ⚠️ الأرقام والتواريخ والنصوص هنا أمثلة — عدّلها بالبيانات الحقيقية
export const ABOUT_CONTENT: Record<AboutLocale, AboutContent> = {
  ar: {
    hero: {
      hat: "عند تشغيل البرنامج",
      lines: ["مش بنحفّظ كود،", "إحنا بنبني", "مبرمجين."],
      bubble: "أهلًا! يلا نبدأ",
      subtitle:
        "CodeSchool بتعلّم الأطفال والمبتدئين البرمجة بالتطبيق: مشاريع حقيقية، ومدرّب جنبهم في كل خطوة.",
      run: "شغّل",
      replay: "شغّل تاني",
      primaryCta: { label: "ابدأ رحلتك", href: "/subscriptions" },
    },
    story: {
      title: "الحكاية",
      segments: [
        { text: "إحنا مؤمنين إن البرمجة مهارة زي القراءة والكتابة. عشان كده بدل الحفظ والملل، " },
        { text: "كل مفهوم بيتحوّل لمشروع حقيقي", mark: true },
        { text: " الطالب يفتخر بيه، ومعاه مدرّب بيمشي جنبه خطوة بخطوة لحد ما " },
        { text: "يبني بإيده", mark: true },
        { text: "." },
      ],
      mission: {
        title: "رسالتنا",
        text: "نبسّط البرمجة ونقدّمها بأسلوب ممتع وعملي، عشان كل طفل ومبتدئ يبني مهارات حقيقية تفتحله أبواب المستقبل.",
      },
      vision: {
        title: "رؤيتنا",
        text: "نكون المنصة الأولى في العالم العربي لتعليم البرمجة، ونخرّج جيلًا بيصنع التكنولوجيا مش بيستهلكها بس.",
      },
    },
    stats: {
      title: "بالأرقام",
      items: [
        { value: 1500, suffix: "+", label: "طالب وطالبة" },
        { value: 40, suffix: "+", label: "مدرّب" },
        { value: 25, suffix: "+", label: "كورس ومسار" },
        { value: 98, suffix: "%", label: "رضا أولياء الأمور" },
      ],
    },
    principles: {
      title: "بنعلّم إزاي",
      items: [
        { title: "نبدأ بمشروع", text: "الطالب بيشوف النتيجة من أول جلسة، والمفاهيم بتيجي وهو بيبني." },
        { title: "الغلطة جزء من التعلّم", text: "الـ bug مش فشل، ده أول خطوة في الحل. بنشجّع التجربة والمحاولة." },
        { title: "مدرّب جنب كل طالب", text: "متابعة حقيقية من مدرّب بيعرف مستوى كل طالب وبيمشي معاه." },
        { title: "نفتخر بالنتيجة", text: "كل طالب بيطلع بمشاريع يعرضها في بورتفوليو باسمه." },
      ],
    },
    journey: {
      title: "رحلتنا",
      items: [
        { year: "2022", title: "البداية", text: "أول دفعة صغيرة من الطلاب." },
        { year: "2023", title: "التوسّع", text: "مسارات جديدة ومدرّبين أكتر." },
        { year: "2024", title: "المنصة الرقمية", text: "لوحات تحكم للطالب والمدرّب." },
        { year: "قريبًا", title: "اللي جاي", text: "توسّع في الشبكة ومسارات الذكاء الاصطناعي." },
      ],
    },
    cta: {
      hat: "لما تكون جاهز",
      title: "ابدأ أول مشروع",
      text: "مدرّبين بيحبوا اللي بيعملوه مستنيينك.",
      href: "/contact",
    },
  },
  en: {
    hero: {
      hat: "when program starts",
      lines: ["We don't memorize code.", "We build", "coders."],
      bubble: "Hi! Let's start",
      subtitle:
        "CodeSchool teaches kids and beginners to code by building: real projects, with an instructor beside them at every step.",
      run: "Run",
      replay: "Run again",
      primaryCta: { label: "Start your journey", href: "/subscriptions" },
    },
    story: {
      title: "The story",
      segments: [
        { text: "We believe coding is a skill like reading and writing. So instead of memorizing and boredom, " },
        { text: "every concept becomes a real project", mark: true },
        { text: " students are proud of, with an instructor beside them step by step until they " },
        { text: "build on their own", mark: true },
        { text: "." },
      ],
      mission: {
        title: "Our mission",
        text: "To simplify programming and teach it in a fun, practical way so every child and beginner builds real skills that open doors to the future.",
      },
      vision: {
        title: "Our vision",
        text: "To be the leading coding platform in the Arab world, raising a generation that builds technology, not just consumes it.",
      },
    },
    stats: {
      title: "By the numbers",
      items: [
        { value: 1500, suffix: "+", label: "Students" },
        { value: 40, suffix: "+", label: "Instructors" },
        { value: 25, suffix: "+", label: "Courses & tracks" },
        { value: 98, suffix: "%", label: "Parent satisfaction" },
      ],
    },
    principles: {
      title: "How we teach",
      items: [
        { title: "Start with a project", text: "Students see results from the first session, and concepts arrive while they build." },
        { title: "Mistakes are part of learning", text: "A bug isn't failure, it's the first step to the fix. We encourage trying things." },
        { title: "An instructor beside every student", text: "Real follow-up from an instructor who knows each student's level." },
        { title: "Proud of the result", text: "Every student leaves with projects to show in a portfolio under their name." },
      ],
    },
    journey: {
      title: "Our journey",
      items: [
        { year: "2022", title: "The beginning", text: "Our first small cohort of students." },
        { year: "2023", title: "Growth", text: "New tracks and more instructors." },
        { year: "2024", title: "Digital platform", text: "Dashboards for students and instructors." },
        { year: "Soon", title: "What's next", text: "Growing our network and adding AI tracks." },
      ],
    },
    cta: {
      hat: "when you're ready",
      title: "Start your first project",
      text: "Instructors who love what they do are waiting for you.",
      href: "/contact",
    },
  },
};