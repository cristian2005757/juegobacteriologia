import { useEffect, useReducer } from "react";
import { audio } from "./game/audio";
import { initialState, reducer } from "./game/logic";
import { Backdrop } from "./ui/art";
import { CombatScreen } from "./ui/CombatScreen";
import { CastScreen } from "./ui/CastScreen";
import { ReceptionScreen } from "./ui/Reception";
import {
  BriefScreen,
  CodexScreen,
  DebriefScreen,
  EndingScreen,
  MapScreen,
  RewardScreen,
  TitleScreen,
} from "./ui/screens";

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    const start = () => audio.unlock();
    window.addEventListener("pointerdown", start);
    return () => window.removeEventListener("pointerdown", start);
  }, []);

  useEffect(() => {
    const combat = state.combat;
    if (state.screen === "ending" || combat?.won) audio.setMood("clear");
    else if (combat && state.screen === "combat" && combat.patient / combat.patientMax < 0.35) audio.setMood("danger");
    else audio.setMood("ward");
  }, [state.screen, state.combat]);

  return (
    <>
      <Backdrop />
      <div className="app-root">
        {state.screen === "title" && <TitleScreen dispatch={dispatch} />}
        {state.screen === "cast" && <CastScreen dispatch={dispatch} />}
        {state.screen === "reception" && <ReceptionScreen state={state} dispatch={dispatch} />}
        {state.screen === "codex" && <CodexScreen dispatch={dispatch} />}
        {state.screen === "map" && <MapScreen state={state} dispatch={dispatch} />}
        {state.screen === "brief" && <BriefScreen state={state} dispatch={dispatch} />}
        {state.screen === "combat" && state.combat && (
          <CombatScreen combat={state.combat} score={state.score} dispatch={dispatch} />
        )}
        {state.screen === "debrief" && <DebriefScreen state={state} dispatch={dispatch} />}
        {state.screen === "reward" && <RewardScreen state={state} dispatch={dispatch} />}
        {state.screen === "ending" && <EndingScreen state={state} dispatch={dispatch} />}
      </div>
    </>
  );
}
