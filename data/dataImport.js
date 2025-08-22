export function dataImport() {
  
  const title = "Привет, это тест приложения";

  const text = `Добрый день!

  Как дела?

  Обрати внимание что есть отсутпы между абзацами.
`;

  return [
    { email: "user@yandex.ru", title, text, file: "data/file.pdf" },
    { email: "info@domain.com", title, text },
    { email: "sharik@mail.ru", title, text, file: "data/file.pdf" },
    { email: "big-man@gmail.com", title, text},
  ];
}

