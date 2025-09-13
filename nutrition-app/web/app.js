const scriptURL = 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec';

const stoolTypeSelect = document.getElementById('stoolType');
for (let i = 1; i <= 7; i++) {
  const option = document.createElement('option');
  option.value = i;
  option.textContent = `Bristol ${i}`;
  stoolTypeSelect.appendChild(option);
}

document.getElementById('entry-form').addEventListener('submit', async e => {
  e.preventDefault();

  const data = {
    mealTime: document.getElementById('mealTime').value,
    mealType: document.getElementById('mealType').value,
    foodItems: document.getElementById('foodItems').value,
    stoolTime: document.getElementById('stoolTime').value,
    stoolType: document.getElementById('stoolType').value
  };

  await fetch(scriptURL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  e.target.reset();
});
