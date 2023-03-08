const confirmButton = document.querySelector("#confirm");
const cancelButton = document.querySelector("#cancel");

confirmButton.addEventListener("click", () => {
  confirmButton.classList.add("is-loading");
  cancelButton.setAttribute("disabled", true);
  const rows = document.querySelectorAll("#items tbody tr");
  const items = [];
  for (const row of rows) {
    const cells = row.querySelectorAll("td");
    const id = cells[0].textContent;
    const name = cells[1].textContent;
    const website = cells[2].textContent;
    items.push({ id, name, website });
  }
  fetch("/start", {
    method: "post",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(items),
  })
    .then((res) => res.json())
    .then((res) => {
      console.log(res);
    })
    // .then((url) => {
    //   const a = document.createElement("a");
    //   a.href = url;
    //   a.download = "outputfile.xlsx";
    //   a.click();
    // })
    .catch((res) => {
      console.log(res);
    })
    .finally(() => {
      confirmButton.classList.remove("is-loading");
      cancelButton.setAttribute("disabled", false);
    });
});
