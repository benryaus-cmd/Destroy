import { useEffect } from 'react';
import GameDialogs from '@/game/GameDialogs';
import './game/game.css';
let booted = false;
type IconName = 'back' | 'undo' | 'redo' | 'zoomIn' | 'zoomOut' | 'reset' | 'pause';
const ICON_PATHS: Record<IconName, string> = {
  back: '<path d="m15 4-8 8 8 8"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h9a6 6 0 0 1 0 12h-2"/>',
  redo: '<path d="m15 14 5-5-5-5"/><path d="M20 9h-9a6 6 0 0 0 0 12h2"/>',
  zoomIn: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5M10.5 7v7M7 10.5h7"/>',
  zoomOut: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5M7 10.5h7"/>',
  reset: '<path d="M20 7v5h-5M20 12a8 8 0 1 0 1 4"/>',
  pause: '<path d="M8 5v14M16 5v14"/>'
};
function Icon({
  name
}: {
  name: IconName;
}) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <g dangerouslySetInnerHTML={{
      __html: ICON_PATHS[name]
    }} />
    </svg>;
}
const App = () => {
  useEffect(() => {
    if (booted) return;
    booted = true;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Bangers&family=Rubik:wght@500;700&display=swap';
    document.head.appendChild(link);
    void import('@/game/monsterGame.js');
  }, []);
  return <>
      <canvas id="c" /><div id="event-feed" aria-hidden="true" />
      <div id="menu" className="ov on">
        <div id="logo"><small>MONSTER MAKER · TEST BUILD v0.5.0</small><h1>RAMPAGE</h1><div className="drip"></div></div>
        <div id="campaign-summary" className="glass"><span className="eyebrow">YOUR CITY. YOUR CREATURE.</span><h2>Start small. Wreck everything.</h2><div id="character-trials" aria-label="Playtest character"><button id="trial-creator" className="s" aria-pressed="true">Your monster</button><button id="trial-godzilla" className="s" aria-pressed="false">Godzilla</button><button id="trial-kong" className="s" aria-pressed="false">Kong</button></div><small id="trial-perk">Your custom creature and balanced stats</small><p id="campaign-info">Grow through an endless city. Survive. Earn upgrades.</p><div className="campaign-actions"><button id="quick-start">START RAMPAGE</button><button className="s" id="continue-run">NEW CITY</button><button className="s" id="open-mutations">UPGRADES</button></div><small id="campaign-status">Progress saves on this device.</small></div><div id="mbot">
          <div id="slots"></div>
          <div id="mbar">
            <button className="s" id="mq">Graphics: High</button>
            <button className="s" id="mh">How to play</button><button className="s" id="menu-tune">Test settings</button>
          </div>
          <div className="gore-controls" aria-label="Gore settings">
            <button className="s gore-toggle" id="gore-menu-toggle" type="button" aria-pressed="true">Gore: On</button>
            <label className="gore-slider"><span>Intensity</span><input id="gore-menu-level" type="range" min="0" max="100" step="5" value="70" aria-label="Gore intensity" /></label>
          </div>
        </div>
      </div>
      <div id="edit" className="ov">
        <div id="etop" className="glass">
          <button className="s ic" id="eb1" aria-label="Back"><Icon name="back" /></button>
          <input id="nmi" maxLength={14} placeholder="Monster name" />
          <button className="s ic" id="eu" aria-label="Undo"><Icon name="undo" /></button>
          <button className="s ic" id="er" aria-label="Redo"><Icon name="redo" /></button>
        </div>
        <div id="estats" className="glass"><div id="bars"></div></div>
        <div id="ez">
          <button className="s" id="ez1" aria-label="Zoom in"><Icon name="zoomIn" /></button>
          <button className="s" id="ez2" aria-label="Zoom out"><Icon name="zoomOut" /></button>
          <button className="s" id="ez3" aria-label="Reset view"><Icon name="reset" /></button>
        </div>
        <div id="panel"><div id="tabs"></div><div id="ctl"></div><div id="eb"></div></div>
      </div>
      <div id="hud" className="ov">
        <div id="hl" className="pe glass">
          <img id="pt" alt="" />
          <div><div id="nm"></div><div id="hpw"><i id="hp"></i><span id="hpt"></span></div></div>
        </div>
        <div id="hs" className="pe"><div id="sc">0</div><div id="cb"></div><div id="cbb"><i></i></div></div>
        <div id="hr" className="pe">
          <canvas id="mm" width={208} height={208}></canvas>
          <div id="stars"></div>
          <div id="hbt">
            <button className="s" id="zi" aria-label="Zoom in"><Icon name="zoomIn" /></button>
            <button className="s" id="zo" aria-label="Zoom out"><Icon name="zoomOut" /></button>
            <button className="s" id="mb" aria-label="Pause"><Icon name="pause" /></button>
          </div>
        </div>
        <div id="conquest-hud" className="glass pe"><div><span id="district-label">MIDTOWN</span><b id="growth-label">HATCHLING</b></div><div className="growth-track"><i id="growth-fill" /></div><small id="challenge-label">Eat to grow</small><small id="save-status">Progress saved locally</small></div><div id="action-hint" /><button className="s" id="game-tune">TUNE</button><div id="cnt" className="pe">
          <span className="glass metric" id="k1"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="7" r="3" /><path d="M5 21v-2a7 7 0 0 1 14 0v2" /></svg><b id="k1v">0</b></span>
          <span className="glass metric" id="k2"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 11 9-8 9 8v10H3z" /><path d="M9 21v-7h6v7" /></svg><b id="k2v">0</b></span>
          <span className="glass metric" id="k3"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 13h18l-2-5H6zM5 13l-2 4v2h18v-2l-2-4" /><circle cx="7" cy="17" r="1" /><circle cx="17" cy="17" r="1" /></svg><b id="k3v">0</b></span>
        </div>
      </div>
      <div id="btns">
        <button id="bg" className="act utility"><b id="grab-label">GRAB</b><small>Q</small><u /></button><button id="bj" className="act utility"><b id="jump-label">JUMP / SLAM</b><small>R</small><u /></button><button id="bd" className="act utility"><b>CHARGE</b><small>F</small><u /></button><button id="bp" className="act utility"><b>POWER</b><small>X</small><u /></button><button id="bs" className="act"><b>SMASH</b><small>E</small><u></u></button>
        <button id="bc" className="act"><b>CHOMP</b><small>SPACE</small><u></u></button>
      </div>
      <div id="joy"><i></i></div>
      <div id="hint"></div>
      <GameDialogs />
    </>;
};
export default App;