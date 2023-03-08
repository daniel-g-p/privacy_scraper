const uploadInput = document.querySelector("#upload");

uploadInput.addEventListener("change", (event) => {
  if (event.target.value) {
    const form = event.target.parentElement;
    form.submit();
  }
});
