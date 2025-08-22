
## Подготовка в работе:

1) Установите зависимости через `npm i`  или любым другим удобным способом.

2) Отредактируйте под свои задачи файлы: **.env** и содержимое папки **"data"**.

3) Создайте и настройке базу данных для работы приложенияс именем **pin_nodemailer_db**.


## Вот краткая инструкция:

а) Авторизация

`mysql -u root -p` - зайти в **mysql** + пароль

б) Удаляем базу данных, если нужно

`DROP DATABASE pin_nodemailer_db;`

в) Создаем базу данных, если нужно

`CREATE DATABASE IF NOT EXISTS pin_nodemailer_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`

г) Если не работает `node app.js import` для создания таблиц и колонок автоматом, то выбираем базу данных

`USE pin_nodemailer_db;`

д) Cоздаем в ручную таблицу **emails** с нужными колонками

CREATE TABLE IF NOT EXISTS emails (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  text TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  retry_count INT NOT NULL DEFAULT 0,
  last_error TEXT NULL,
  sent_at DATETIME NULL,
  file VARCHAR(255) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


4) Откройте в консоле/терминале две вкладки.

В первой вкладке выполните команду: `node worker.js` - Мониторинг состояния. Запускаеся в отдельном терминале.

В второй вкладке выполните команды:

 а) `node app.js import` - она автоматом создаст таблицы и все нужные колонки, если будет ошибка, то по инструкции выше ссоздайте их в ручную, зачем снова выполните `node app.js import`, что бы содежимое файла **data/dataImport.js** запушилось в БД.

 б) Выполните команду `node app.js send` - отправить письма.

 В вкладках консоле/терминале отобразится результат.


## Команды:

`node app.js import` - запушить в БД.

`node app.js send` - отправить письма.

`node app.js export` - спулить к себе из БД в JSON формате.

`node app.js reset email=login@yandex.ru` - Для сброса статуса и подготовки письма к повторной отправке используйте

или

`node app.js reset id=15` - Для сброса статуса и подготовки письма к повторной отправке используйте

`node app.js logs` - Логи

`node app.js list` — Выводит в консоль таблицу с пользователями и их статусами

`node worker.js` - Мониторинг состояния. Запускаеся в отдельном терминале.


---
Если есть вопросы пишите: `@SergeyPinchukov`
