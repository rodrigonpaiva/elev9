import styles from "./page.module.css";

const features = [
  {
    title: "Smart training plans",
    description:
      "Structured workout generation based on goals, activity level and training availability.",
  },
  {
    title: "Workout tracking",
    description:
      "Log completed sessions with exercise-level results, duration and difficulty feedback.",
  },
  {
    title: "Progress insights",
    description:
      "Track streaks, workout history and concise progress metrics in a mobile-first flow.",
  },
  {
    title: "AI-ready architecture",
    description:
      "Spec-driven monorepo design prepared for richer coaching, personalization and future AI features.",
  },
];

const stack = ["NestJS", "React Native / Expo", "MongoDB", "Nx monorepo"];

export default function HomePage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <p className={styles.kicker}>Elev9 Coach</p>
          <h1 className={styles.heroTitle}>Elev9 — AI Fitness Coach</h1>
          <p className={styles.heroSubtitle}>
            Train smarter. Track progress. Stay consistent.
          </p>
          <p className={styles.heroCopy}>
            Elev9 is a fitness product prototype built to connect onboarding,
            training plans, workout execution and progress visibility in one
            clear mobile experience.
          </p>
          <div className={styles.heroActions}>
            <a className={styles.primaryButton} href="#demo">
              View Demo
            </a>
            <a className={styles.secondaryButton} href="#source">
              GitHub
            </a>
          </div>
        </div>

        <div className={styles.heroVisual}>
          <div className={styles.visualGlow} />
          <div className={styles.phoneFrame}>
            <div className={styles.phoneTop}>
              <span className={styles.phonePill}>Today</span>
              <span className={styles.phoneValue}>Workout ready</span>
            </div>
            <div className={styles.phoneCard}>
              <span className={styles.cardLabel}>Current streak</span>
              <strong className={styles.cardValue}>🔥 5 days</strong>
            </div>
            <div className={styles.phoneCard}>
              <span className={styles.cardLabel}>Weekly progress</span>
              <strong className={styles.cardValue}>4 workouts</strong>
            </div>
            <div className={styles.phoneChart}>
              <span />
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <p className={styles.sectionKicker}>Features</p>
          <h2 className={styles.sectionTitle}>A mobile fitness loop that feels coherent</h2>
          <p className={styles.sectionCopy}>
            The project is designed to show product thinking, clear API
            contracts and a realistic path toward a production-grade coaching
            platform.
          </p>
        </div>
        <div className={styles.featureGrid}>
          {features.map((feature) => (
            <article key={feature.title} className={styles.featureCard}>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section} id="demo">
        <div className={styles.sectionHeader}>
          <p className={styles.sectionKicker}>Screenshots</p>
          <h2 className={styles.sectionTitle}>Mobile preview placeholders</h2>
          <p className={styles.sectionCopy}>
            Reserved slots for app captures from onboarding, dashboard,
            workout execution and progress views.
          </p>
        </div>
        <div className={styles.shotGrid}>
          <div className={styles.shotCard}>
            <span>Dashboard</span>
          </div>
          <div className={styles.shotCard}>
            <span>Workout</span>
          </div>
          <div className={styles.shotCard}>
            <span>Progress</span>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <p className={styles.sectionKicker}>Tech stack</p>
          <h2 className={styles.sectionTitle}>Built inside one Nx workspace</h2>
        </div>
        <div className={styles.stackRow}>
          {stack.map((item) => (
            <div key={item} className={styles.stackPill}>
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className={styles.ctaSection} id="source">
        <div className={styles.ctaCard}>
          <p className={styles.sectionKicker}>Next step</p>
          <h2 className={styles.sectionTitle}>Want to explore the product?</h2>
          <p className={styles.sectionCopy}>
            Open the mobile demo flow, inspect the monorepo structure and review
            the backend architecture that powers the experience.
          </p>
          <div className={styles.heroActions}>
            <a className={styles.primaryButton} href="#demo">
              Try the demo
            </a>
            <a className={styles.secondaryButton} href="#source">
              View source code
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
