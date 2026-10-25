/* Shared panel/worker translations. English is independent of browser locale. */
globalThis.I18n = (() => {
  let language = 'en';
  const messages = {
    'Settings': 'Настройки',
    'Language': 'Язык',
    'Language is saved in this browser only.': 'Язык сохраняется только в этом браузере.',
    'Prompts': 'Промпты',
    'AI on Selection': 'ИИ для выделенного текста',
    'Auto-paste into focused field': 'Автовставка в активное поле',
    'Search prompts': 'Поиск промптов',
    'Export': 'Экспорт',
    'Import': 'Импорт',
    '+ Folder': '+ Папка',
    '+ Prompt': '+ Промпт',
    'Select a folder or add one.': 'Выберите папку или добавьте новую.',
    'Add a folder to get started.': 'Добавьте папку, чтобы начать.',
    'Drag and drop to arrange. Double-click to edit.': 'Перетаскивайте для сортировки. Двойной щелчок — редактирование.',
    'Enable AI on Selection': 'Включить ИИ для выделенного текста',
    'Load default prompts & targets': 'Загрузить стандартные промпты и ИИ-сервисы',
    'AI Targets': 'ИИ-сервисы',
    '+ Target': '+ ИИ-сервис',
    'Selection Prompts': 'Промпты для выделенного текста',
    'Drag and drop selection prompts to reorder. Double-click to edit.': 'Перетаскивайте промпты для сортировки. Двойной щелчок — редактирование.',
    'Syncing': 'Синхронизация',
    'How to set up sync': 'Как настроить синхронизацию',
    'First browser': 'Первый браузер',
    'Another browser': 'Другой браузер',
    'Sync backend': 'Хранилище синхронизации',
    'Sync URL': 'Ссылка на Gist',
    'Gist URL or ID': 'Ссылка или идентификатор Gist',
    'Gist token': 'Токен GitHub',
    'Token with Gist permission': 'Токен с разрешением gist',
    'Sync password': 'Пароль синхронизации',
    'Used to encrypt your prompts': 'Для шифрования ваших промптов',
    'Your prompts are encrypted before upload. This password is remembered only while this panel is open. If you lose it, the encrypted backup cannot be opened.': 'Промпты шифруются перед отправкой. Пароль хранится только пока открыта эта панель. Если вы его потеряете, открыть зашифрованную копию будет невозможно.',
    'Enable syncing': 'Сохранить подключение',
    'Create a private Gist': 'Создать секретный Gist',
    'Sync is not configured': 'Синхронизация не настроена',
    'Add your Gist token and sync password to get started.': 'Для начала введите токен GitHub и пароль синхронизации.',
    'Sync now': 'Синхронизировать',
    'Disconnect': 'Отключить',
    'Advanced: choose a version manually': 'Дополнительно: выбрать версию вручную',
    'Use remote version': 'Загрузить версию из Gist',
    'Upload local version': 'Отправить локальную версию',
    'Check remote': 'Проверить Gist',
    'Manual sync only. Your data stays local unless you enable this.': 'Синхронизация только вручную. Пока вы её не включили, данные остаются в браузере.',
    'Remote changes detected': 'В Gist обнаружены изменения',
    'Choose sync version': 'Выберите версию данных',
    'The Gist changed since the last sync. Choose which version to keep.': 'После последней синхронизации Gist изменился. Выберите, какую версию сохранить.',
    'This browser already has local data. Choose whether to use the Gist or upload this local data.': 'В этом браузере уже есть данные. Выберите: загрузить данные из Gist или отправить локальные данные.',
    'This browser has no sync history for this Gist yet. Choose which version to use.': 'Этот браузер ещё не синхронизировался с этим Gist. Выберите, какую версию использовать.',
    'Use remote': 'Использовать Gist',
    'Use local': 'Использовать локальную',
    'Cancel': 'Отмена',
    'Save': 'Сохранить',
    'Delete': 'Удалить',
    'Edit': 'Изменить',
    'Copy': 'Копировать',
    'Copied!': 'Скопировано!',
    'Unnamed': 'Без названия',
    'Untitled': 'Без названия',
    'Imported': 'Импортировано',
    'AI': 'ИИ',
    'AI Target': 'ИИ-сервис',
    'Selection prompt': 'Промпт для выделенного текста',
    'Prompts: {count}': 'Промптов: {count}',
    'No prompts found.': 'Промпты не найдены.',
    'No prompts. Click "+ Prompt" to add one.': 'Промптов пока нет. Нажмите «+ Промпт», чтобы добавить.',
    'No AI targets. Click "+ Target" to add one.': 'ИИ-сервисов пока нет. Нажмите «+ ИИ-сервис», чтобы добавить.',
    'No selection prompts. Click "+ Prompt" to add one.': 'Промптов для выделенного текста пока нет. Нажмите «+ Промпт», чтобы добавить.',
    'Query:': 'Параметр запроса:',
    ' · paste fallback': ' · вставка текста',
    'New folder': 'Новая папка',
    'Edit folder': 'Редактирование папки',
    'Folder name': 'Название папки',
    'New prompt': 'Новый промпт',
    'Edit prompt': 'Редактирование промпта',
    'Title': 'Название',
    'Prompt text': 'Текст промпта',
    'New AI target': 'Новый ИИ-сервис',
    'Edit AI target': 'Редактирование ИИ-сервиса',
    'Name': 'Название',
    'Base URL (https://...)': 'Адрес сервиса (https://...)',
    'Query param (q=)': 'Параметр запроса (q=)',
    'Use paste fallback': 'Использовать вставку текста',
    'New selection prompt': 'Новый промпт для выделенного текста',
    'Edit selection prompt': 'Редактирование промпта для выделенного текста',
    'Template with {{text}}': 'Шаблон с {{text}}',
    'Select a folder first.': 'Сначала выберите папку.',
    'Invalid format: expected a JSON array of folders.': 'Неверный формат: ожидался JSON-массив папок.',
    'Invalid format: expected a JSON object.': 'Неверный формат: ожидался JSON-объект.',
    'Import done. {count} folder(s) loaded.': 'Импорт завершён. Загружено папок: {count}.',
    'AI on Selection import done. {targets} target(s), {prompts} prompt(s).': 'Импорт настроек ИИ завершён. Сервисов: {targets}, промптов: {prompts}.',
    'Invalid JSON or format: {detail}': 'Некорректный JSON или формат: {detail}',
    'Detail: {detail}': 'Подробности: {detail}',
    'Operation failed.': 'Не удалось выполнить операцию.',
    'Operation failed. Detail: {detail}': 'Не удалось выполнить операцию. Подробности: {detail}',
    'Error': 'Ошибка',
    'Ready': 'Готово',
    'Almost ready': 'Почти готово',
    'Create a private Gist or paste an existing Gist URL.': 'Создайте секретный Gist или вставьте ссылку на существующий.',
    'Gist: {id}': 'Gist: {id}',
    'No Gist selected.': 'Gist не выбран.',
    'Last sync: {date}': 'Последняя синхронизация: {date}',
    'No successful sync yet.': 'Успешных синхронизаций ещё не было.',
    'Remote data has an invalid format.': 'Данные в Gist имеют неверный формат.',
    'Enter the encryption passphrase first.': 'Сначала введите пароль синхронизации.',
    'Enter and save a GitHub token first.': 'Сначала введите и сохраните токен GitHub.',
    'Enter a Gist URL or create a private Gist first.': 'Сначала введите ссылку на Gist или создайте секретный Gist.',
    'Enter a GitHub token first.': 'Сначала введите токен GitHub.',
    'Already up to date. No changes to upload or download.': 'Данные уже актуальны. Нет изменений для отправки или загрузки.',
    'Remote version available': 'В Gist доступна версия данных',
    'Pull it before pushing local data.': 'Загрузите её перед отправкой локальных данных.',
    'No remote changes detected.': 'В Gist нет новых изменений.',
    'Choose Pull to review and apply the remote version.': 'Нажмите «Загрузить версию из Gist», чтобы применить её.',
    'Click Sync now when you are ready.': 'Нажмите «Синхронизировать», когда будете готовы.',
    'Create a private Gist to finish setup.': 'Создайте секретный Gist, чтобы завершить настройку.',
    'Downloading and decrypting the remote version...': 'Загрузка и расшифровка версии из Gist…',
    'Encrypting and uploading the local version...': 'Шифрование и отправка локальной версии…',
    'GitHub token is not configured.': 'Токен GitHub не настроен.',
    'Gist ID is not configured.': 'Идентификатор Gist не настроен.',
    'The selected Gist does not contain SimplestPrompt data.': 'В выбранном Gist нет данных SimplestPrompt.',
    'GitHub API error ({status}).': 'Ошибка API GitHub ({status}).',
    'Encryption passphrase is required.': 'Необходим пароль синхронизации.',
    'Unsupported or invalid encrypted sync format.': 'Неподдерживаемый или неверный формат зашифрованных данных.',
    'Unable to decrypt sync data. Check the passphrase.': 'Не удалось расшифровать данные. Проверьте пароль синхронизации.',
    'Decrypted sync data is invalid.': 'Расшифрованные данные имеют неверный формат.',
    'Add prompts in panel...': 'Добавьте промпты в панели…',
    '... more in panel': '… остальные в панели',
    'Open panel': 'Открыть панель',
    'Refresh menu': 'Обновить меню',
    'Add selection prompts in panel...': 'Добавьте промпты для выделенного текста в панели…',
    'Add AI targets in panel...': 'Добавьте ИИ-сервисы в панели…',
    'Pasted!': 'Вставлено!',
    'Copied! Paste with Ctrl+V': 'Скопировано! Вставьте с помощью Ctrl+V',
    'Failed to copy': 'Не удалось скопировать',
    'Blocked on browser internal pages. Use a regular website tab.': 'На внутренних страницах браузера это недоступно. Откройте обычный сайт.',
    'Menu refreshed': 'Меню обновлено',
    'guide.intro': {
      en: 'Keep your prompts and settings in sync between browsers using GitHub. You need a free GitHub account. A Gist is a file stored on GitHub; this extension uploads only encrypted data.',
      ru: 'Синхронизируйте промпты и настройки между браузерами через GitHub. Нужна бесплатная учётная запись GitHub. Gist — файл на GitHub; расширение отправляет только зашифрованные данные.'
    },
    'guide.token': {
      en: '<a href="https://github.com/settings/tokens/new?scopes=gist&amp;description=SimplestPrompt" target="_blank" rel="noopener noreferrer">Create a GitHub token (classic)</a>. Select only the <strong>gist</strong> permission, click <strong>Generate token</strong>, then copy the token into <strong>Gist token</strong> below. Treat it like a password: it grants access to your Gists.',
      ru: '<a href="https://github.com/settings/tokens/new?scopes=gist&amp;description=SimplestPrompt" target="_blank" rel="noopener noreferrer">Создайте токен GitHub (classic)</a>. Выберите только разрешение <strong>gist</strong>, нажмите <strong>Generate token</strong> и скопируйте токен в поле <strong>Токен GitHub</strong> ниже. Храните его как пароль: он даёт доступ к вашим Gist.'
    },
    'guide.password': {
      en: 'Choose a strong <strong>Sync password</strong> and enter it below. This is a separate encryption password, not your GitHub password. Keep it somewhere safe: it cannot be recovered.',
      ru: 'Придумайте надёжный <strong>Пароль синхронизации</strong> и введите его ниже. Это отдельный пароль шифрования, не пароль GitHub. Сохраните его в надёжном месте: восстановить его нельзя.'
    },
    'guide.create': {
      en: 'Leave <strong>Sync URL</strong> empty and click <strong>Create a private Gist</strong>. This immediately uploads an encrypted copy of your current data and saves the connection. No need to create a Gist on GitHub yourself.',
      ru: 'Оставьте поле <strong>Ссылка на Gist</strong> пустым и нажмите <strong>Создать секретный Gist</strong>. Зашифрованная копия текущих данных сразу отправится на GitHub, а подключение сохранится. Создавать Gist на сайте вручную не нужно.'
    },
    'guide.url': {
      en: 'Keep the Gist URL that appears in <strong>Sync URL</strong>: you will need it in your other browser.',
      ru: 'Сохраните адрес из поля <strong>Ссылка на Gist</strong>: он понадобится в другом браузере.'
    },
    'guide.connect': {
      en: 'Enter your GitHub token, the same <strong>Sync URL</strong>, and the same <strong>Sync password</strong>. Do not create another Gist.',
      ru: 'Введите токен GitHub, ту же <strong>Ссылку на Gist</strong> и тот же <strong>Пароль синхронизации</strong>. Не создавайте новый Gist.'
    },
    'guide.download': {
      en: 'Click <strong>Enable syncing</strong>, then <strong>Sync now</strong>. If asked which version to keep, choose <strong>Use remote</strong> to download the data from your first browser; this replaces this browser\'s local data.',
      ru: 'Нажмите <strong>Сохранить подключение</strong>, затем <strong>Синхронизировать</strong>. Если появится выбор версии, нажмите <strong>Использовать Gist</strong>, чтобы загрузить данные первого браузера. Локальные данные этого браузера будут заменены.'
    },
    'guide.daily': {
      en: '<strong>Day to day:</strong> click <strong>Sync now</strong> after making changes, then click it in your other browser to receive them. Sync does not run automatically. If both copies changed, you choose which one to keep; they are not merged.',
      ru: '<strong>При обычной работе:</strong> после изменений нажмите <strong>Синхронизировать</strong>, затем нажмите эту кнопку в другом браузере, чтобы получить изменения. Автоматической синхронизации нет. Если изменились обе копии, нужно выбрать одну: данные не объединяются.'
    },
    'guide.storage': {
      en: 'The token is saved only in this browser. The sync password is kept only while this panel is open; enter it again after reopening. Neither is included in the encrypted upload.',
      ru: 'Токен сохраняется только в этом браузере. Пароль хранится лишь пока панель открыта; после повторного открытия введите его заново. Ни токен, ни пароль не включаются в отправляемые данные.'
    },
    'guide.secret': {
      en: 'A secret Gist is unlisted, not access-restricted: anyone with its link can view the encrypted file. Keep your sync password safe.',
      ru: 'Секретный Gist скрыт из общего списка, но доступен всем, у кого есть ссылка. Они увидят зашифрованный файл. Берегите пароль синхронизации.'
    },
    'help.url': {
      en: 'First browser: leave empty and use <strong>Create a private Gist</strong> below. Another browser: paste the same Gist URL here.',
      ru: 'Первый браузер: оставьте пустым и нажмите <strong>Создать секретный Gist</strong> ниже. Другой браузер: вставьте сюда ссылку на тот же Gist.'
    },
    'help.token': {
      en: '<a href="https://github.com/settings/tokens/new?scopes=gist&amp;description=SimplestPrompt" target="_blank" rel="noopener noreferrer">Create a token (classic)</a> with only the <strong>gist</strong> permission. This lets the extension read and update your Gist.',
      ru: '<a href="https://github.com/settings/tokens/new?scopes=gist&amp;description=SimplestPrompt" target="_blank" rel="noopener noreferrer">Создайте токен (classic)</a> только с разрешением <strong>gist</strong>. Это позволит расширению читать и обновлять ваши Gist.'
    }
  };

  function normalize(value) { return value === 'ru' ? 'ru' : 'en'; }

  function t(key, params = {}) {
    const entry = Object.prototype.hasOwnProperty.call(messages, key) ? messages[key] : null;
    const text = entry && typeof entry === 'object' ? entry[language] : (language === 'ru' && entry || key);
    // Single braces only: {{text}} is prompt syntax, not a UI parameter.
    return String(text).replace(/(?<!\{)\{(\w+)\}(?!\})/g, (match, name) =>
      Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match);
  }

  async function load() {
    const saved = await chrome.storage.local.get({ language: 'en' });
    language = normalize(saved.language);
    return language;
  }

  async function setLanguage(value) {
    const next = normalize(value);
    await chrome.storage.local.set({ language: next });
    language = next;
    return language;
  }

  function apply(root = document) {
    if (root.documentElement) root.documentElement.lang = language;
    root.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    // Only fixed catalogue entries may supply HTML; never interpolate user data here.
    root.querySelectorAll('[data-i18n-html]').forEach(el => { el.innerHTML = t(el.dataset.i18nHtml); });
    for (const attribute of ['placeholder', 'title', 'aria-label']) {
      root.querySelectorAll(`[data-i18n-${attribute}]`).forEach(el => {
        el.setAttribute(attribute, t(el.getAttribute(`data-i18n-${attribute}`)));
      });
    }
  }

  function errorMessage(error) {
    const message = error && error.message || String(error);
    if (Object.prototype.hasOwnProperty.call(messages, message)) return t(message);
    const github = /^GitHub API error \((\d+)\)\.$/.exec(message);
    if (github) return t('GitHub API error ({status}).', { status: github[1] });
    return language === 'en' ? message : t('Operation failed. Detail: {detail}', { detail: message });
  }

  return { t, load, setLanguage, apply, errorMessage, get language() { return language; } };
})();
