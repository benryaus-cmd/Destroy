const GameDialogs = () => (
  <>
    <div id="pause" className="ov">
      <div className="pnl glass">
        <h2>PAUSED</h2>
        <div className="bt">
          <button id="rs">Resume</button>
          <button className="s" id="qt">Quit</button>
        </div>
        <div className="bt pause-save-row"><button className="s" id="save-run">Save score</button></div>
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
          <button id="rt">Rampage again</button>
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
          <b>Camera</b> drag to orbit and tilt, wheel or zoom buttons to zoom<br />
          <b>Combo</b> chain kills fast for a score multiplier<br />
          <b>Threat</b> the more you wreck, the harder the police and army hit back
        </div>
        <button id="hc2">Got it</button>
      </div>
    </div>
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