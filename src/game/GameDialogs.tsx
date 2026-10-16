const GameDialogs = () => (
  <>
    <div id="pause" className="ov">
      <div className="pnl glass">
        <h2>PAUSED</h2>
        <div className="bt">
          <button id="rs">Resume</button>
          <button className="s" id="qt">End run & menu</button>
        </div>
        <div className="bt pause-save-row"><button className="s" id="save-run">Save upgrades</button></div>
        <div className="bt pause-options"><button className="s" id="pq">Graphics: High</button></div>
        <div className="gore-controls pause-gore-controls" aria-label="Gore settings">
          <button className="s gore-toggle" id="gore-pause-toggle" type="button" aria-pressed="true">Gore: On</button>
          <label className="gore-slider"><span>Intensity</span><input id="gore-pause-level" type="range" min="0" max="100" step="5" value="70" aria-label="Gore intensity" /></label>
        </div>
      </div>
    </div>
    <div id="over" className="ov">
      <div className="pnl glass">
        <h2 id="ot">YOU FELL</h2>
        <div id="ob" className="final-score"></div>
        <div className="grid" id="og"></div>
        <div id="lb-status" className="leaderboard-status">GLOBAL LEADERBOARD</div>
        <div className="bt">
          <button id="rt">New rampage</button><button id="end-upgrades" className="s">Spend destruction points</button>
          <button className="s" id="bm">Menu</button>
        </div>
      </div>
    </div>
    <div id="help" className="ov">
      <div className="pnl glass">
        <h2>HOW TO PLAY</h2>
        <div className="hp">
          <b>Move</b> WASD / arrows, or the on-screen stick<br />
          <b>Chomp</b> Space or CHOMP — eat people to heal and grow<br />
          <b>Smash</b> E or SMASH — ground-pound for buildings, cars and crowds<br />
          <b>Camera</b> overhead follow; wheel or zoom buttons to zoom<br />
          <b>Grab / throw</b> Q or GRAB — face your target and throw cars or tanks<br />
          <b>Jump / slam</b> R — press again in the air to body-slam<br />
          <b>Climb</b> Hold R beside a building, then jump from its roof<br />
          <b>Charge / power</b> F / X — break through walls or unleash your mutation<br />
          <b>Conquest</b> Every run has a fresh endless city. Points and bought upgrades persist.<br />
          <b>Combo</b> chain kills fast for a score multiplier<br />
          <b>Threat</b> the more you wreck, the harder the police and army hit back
        </div>
        <button id="hc2">Got it</button>
      </div>
    </div>
    <div id="evolution" className="ov"><div className="pnl glass evolution-panel"><div className="panel-heading"><div><small>SPEND YOUR DESTRUCTION POINTS</small><h2>UPGRADES</h2></div><button className="s" id="close-evolution">Close</button></div><p id="evolution-balance" /><div id="mutation-list" /><p className="fine">Earn 1 destruction point for every 100 score when a run ends. Buy permanent upgrades here, then start small in a fresh city.</p></div></div>
    <div id="tuning" className="ov"><div className="pnl glass tuning-panel"><div className="panel-heading"><div><small>LIVE TEST CONTROLS</small><h2>TEST SETTINGS</h2></div><button className="s" id="close-tuning">Close</button></div><div id="tuning-fields" /><div className="bt"><button id="tuning-reset" className="s">Reset defaults</button><button id="tuning-export">Export JSON</button></div><textarea id="tuning-json" readOnly aria-label="Settings JSON" placeholder="Export settings to copy them here" /></div></div>
    <div id="toast"></div>
    <div id="banner"></div>
    <div id="preloader" className="loading-screen" role="status" aria-live="polite">
      <div className="loading-card">
        <span className="loading-kicker">CITY SYSTEMS</span>
        <h2 id="load-title">GETTING READY</h2>
        <p id="load-step">Preparing the rampage</p>
        <div className="loading-track" role="progressbar" aria-label="Loading game resources" aria-valuemin={0} aria-valuemax={100} aria-valuenow={0}><i id="load-progress"></i></div>
        <span id="load-percent">0%</span>
      </div>
    </div>
  </>
);

export default GameDialogs;