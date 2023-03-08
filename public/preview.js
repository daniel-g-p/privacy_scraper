const confirmButton = document.querySelector("#confirm");

confirmButton.addEventListener("click", () => {
  const rows = document.querySelectorAll("#items tbody tr");
  const items = [];
  for (const row of rows) {
    const cells = row.querySelectorAll("td");
    const id = cells[0].textContent;
    const name = cells[1].textContent;
    const website = cells[2].textContent;
    items.push({ id, name, website });
  }
  console.log(items);
  fetch("/start", {
    method: "post",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(items),
  })
    .then((res) => {
      console.log(res);
    })
    .catch((res) => {
      console.log(res);
    });
});
