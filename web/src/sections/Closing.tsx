import { WAITLIST_ID, closing } from "../content";
import Sheet, { type SheetInfo } from "../components/Sheet";
import TitleBlock from "../components/TitleBlock";
import WaitlistForm from "../components/WaitlistForm";

export default function Closing({ sheet }: { sheet: SheetInfo }) {
  return (
    <Sheet id="join" sheet={sheet} tone="navy" title={closing.title} intro={closing.body}>
      <TitleBlock id={WAITLIST_ID} title="Join the waitlist" fields={closing.fields}>
        <WaitlistForm />
      </TitleBlock>
    </Sheet>
  );
}
