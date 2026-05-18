import './global.css';

export const metadata = {
  title: 'Elev9 — AI Fitness Coach',
  description:
    'Elev9 is a fitness product prototype that combines smart training plans, workout tracking and progress insights in a mobile-first experience.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
