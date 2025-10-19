function injectVisitorTable() {
  const main = document.createElement('main');
  main.id = "visitorMain";

  Object.assign(main.style, {
    display: "none",              
    height: "100vh",
    flexDirection: "column",
    display: "flex",
    overflow: "hidden",
    width: "100%",
  });

  // Inject inline style directly into div
  const tableWrapperStyle = `
    flex: 1;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
  `;

  main.innerHTML = `
    <div id="tableWrapper" style="${tableWrapperStyle}">
      <table id="visitorTable">
        <thead>
          <tr>
            <th class="row-number">#</th>
            <th>IP Address<br><input class="filter-input" data-col="1" placeholder="IP" /></th>
            <th>Visit Time<br><input class="filter-input" data-col="2" placeholder="Time" /></th>
            <th>Method<br><input class="filter-input" data-col="3" placeholder="Method" /></th>
            <th>Referrer<br><input class="filter-input" data-col="4" placeholder="Referrer" /></th>
            <th>Device<br><input class="filter-input" data-col="5" placeholder="Device" /></th>
            <th>OS<br><input class="filter-input" data-col="6" placeholder="OS" /></th>
            <th>Browser<br><input class="filter-input" data-col="7" placeholder="Browser" /></th>
            <th>Result Text<br><input class="filter-input" data-col="8" placeholder="Result Text" /></th>
            <th>FileName<br><input class="filter-input" data-col="9" placeholder="FileName" /></th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    </div>
  `;

  const container = document.getElementById("mainContent") || document.body;
  container.appendChild(main);
}
