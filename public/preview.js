const confirmButton = document.querySelector("#confirm");
const cancelButton = document.querySelector("#cancel");

const modal = document.querySelector("#modal");
const downloadButton = document.querySelector("#download");

confirmButton.addEventListener("click", () => {
  confirmButton.classList.add("is-loading");
  cancelButton.setAttribute("disabled", true);
  const rows = document.querySelectorAll("#items tbody tr");
  const items = [];
  for (const row of rows) {
    const cells = row.querySelectorAll("td");
    const id = cells[0].textContent.trim();
    const name = cells[1].textContent.trim();
    const website = cells[2].textContent.trim();
    items.push({ id, name, website });
  }
  fetch("/scan", {
    method: "post",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(items),
  })
    .then((res) => res.json())
    .then((res) => {
      downloadButton.setAttribute("href", "/output/" + res.filename);
      modal.classList.add("is-active");
    })
    .catch((error) => {
      console.error(error);
      alert("Something went wrong, please try again...");
    })
    .finally(() => {
      confirmButton.classList.remove("is-loading");
      cancelButton.setAttribute("disabled", false);
    });
});
