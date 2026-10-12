import Footer from "./components/Footer";
import Header from "./components/Header";
import Checks from "./sections/Checks";
import Closing from "./sections/Closing";
import Hero from "./sections/Hero";
import Landlords from "./sections/Landlords";
import Steps from "./sections/Steps";

const sheets = [
  { Section: Hero, scale: 200 },
  { Section: Checks, scale: 100 },
  { Section: Steps, scale: 50 },
  { Section: Landlords, scale: 20 },
  { Section: Closing, scale: 10 },
];

export default function App() {
  return (
    <>
      <Header />
      <main>
        {sheets.map(({ Section, scale }, i) => (
          <Section key={i} sheet={{ number: i + 1, total: sheets.length, scale }} />
        ))}
      </main>
      <Footer />
    </>
  );
}
