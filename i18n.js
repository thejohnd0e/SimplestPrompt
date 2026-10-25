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
    'Paste a Gist link, or leave empty': 'Вставьте ссылку на Gist или оставьте пустым',
    'Update sync settings': 'Обновить настройки синхронизации',
    'That is not a Gist link. A Gist link looks like https://gist.github.com/your-name/0123abc… Leave the field empty to create a Gist automatically.': 'Это не ссылка на Gist. Ссылка на Gist выглядит так: https://gist.github.com/ваше-имя/0123abc… Оставьте поле пустым, чтобы Gist создался автоматически.',
    'Gist token': 'Токен GitHub',
    'Token with Gist permission': 'Токен с разрешением gist',
    'Sync password': 'Пароль синхронизации',
    'Used to encrypt your prompts': 'Для шифрования ваших промптов',
    'Sync is not configured': 'Синхронизация не настроена',
    'Disconnect': 'Отключить',
    'Troubleshooting: overwrite one side': 'Если что-то пошло не так: перезаписать одну из копий',
    'Replace this device with the Gist': 'Заменить данные здесь данными из Gist',
    'Replace the Gist with this device': 'Заменить Gist данными отсюда',
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
    'Gist: {id}': 'Gist: {id}',
    'Last sync: {date}': 'Последняя синхронизация: {date}',
    'No successful sync yet.': 'Успешных синхронизаций ещё не было.',
    'Remote data has an invalid format.': 'Данные в Gist имеют неверный формат.',
    'Enter the encryption passphrase first.': 'Сначала введите пароль синхронизации.',
    'Enter a GitHub token first.': 'Сначала введите токен GitHub.',
    'Downloading and decrypting the remote version...': 'Загрузка и расшифровка версии из Gist…',
    'Encrypting and uploading the local version...': 'Шифрование и отправка локальной версии…',
    'GitHub token is not configured.': 'Токен GitHub не настроен.',
    'Gist ID is not configured.': 'Идентификатор Gist не настроен.',
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
    'Enable syncing': 'Включить синхронизацию',
    'Gist URL': 'Ссылка на Gist',
    'Your data stays local unless you enable syncing.': 'Пока вы не включите синхронизацию, данные остаются в браузере.',
    'Enter the Gist URL, token and password, then click Enable syncing.': 'Введите ссылку на Gist, токен и пароль, затем нажмите «Включить синхронизацию».',
    'Works on its own, nothing to click. Changes from your other browsers arrive when you open this panel.': 'Работает само, нажимать ничего не нужно. Изменения из других браузеров появятся, когда вы откроете эту панель.',
    'Connecting…': 'Подключение…',
    'Set up syncing first.': 'Сначала настройте синхронизацию.',
    'The Gist has no SimplestPrompt data yet.': 'В этом Gist ещё нет данных SimplestPrompt.',
    'GitHub rejected the token. It may have expired. Create a new token and enter it above.': 'GitHub отклонил токен, возможно, срок его действия истёк. Создайте новый токен и введите его выше.',
    'The Gist was not found. Check the Gist URL.': 'Gist не найден. Проверьте ссылку на Gist.',
    'help.intro': {
      en: 'Set it up once and forget it. Your prompts, folders and AI settings are saved to a secret GitHub Gist, encrypted, and kept up to date in all your browsers. Do the same setup in each browser, with the same Gist URL and password.',
      ru: 'Настройте один раз и забудьте. Промпты, папки и настройки ИИ хранятся в секретном Gist на GitHub в зашифрованном виде и сами обновляются во всех ваших браузерах. В каждом браузере сделайте такую же настройку: тот же адрес Gist и тот же пароль.'
    },
    'help.url': {
      en: 'A Gist link looks like <strong>gist.github.com/your-name/…</strong> (not the token page). <a href="https://gist.github.com/" target="_blank" rel="noopener noreferrer">Create a secret Gist</a> and paste its link, or <strong>leave empty</strong> to create one automatically. In other browsers, paste the same link.',
      ru: 'Ссылка на Gist выглядит так: <strong>gist.github.com/ваше-имя/…</strong> (это не страница токенов). <a href="https://gist.github.com/" target="_blank" rel="noopener noreferrer">Создайте секретный Gist</a> и вставьте его ссылку или <strong>оставьте поле пустым</strong>, чтобы Gist создался автоматически. В других браузерах вставьте ту же ссылку.'
    },
    'help.token': {
      en: '<a href="https://github.com/settings/tokens/new?scopes=gist&amp;description=SimplestPrompt" target="_blank" rel="noopener noreferrer">Create a token (classic)</a> with only the <strong>gist</strong> permission and paste the generated token here. Set <strong>Expiration</strong> to <strong>No expiration</strong>, otherwise syncing stops when the token expires. It is saved in this browser only.',
      ru: '<a href="https://github.com/settings/tokens/new?scopes=gist&amp;description=SimplestPrompt" target="_blank" rel="noopener noreferrer">Создайте токен (classic)</a> только с разрешением <strong>gist</strong> и вставьте сюда созданный токен. В поле <strong>Expiration</strong> выберите <strong>No expiration</strong> (без срока действия), иначе синхронизация остановится, когда токен истечёт. Он хранится только в этом браузере.'
    },
    'help.password': {
      en: '<strong>Required.</strong> Make up any password (it is not your GitHub password). It encrypts your data; enter the same one in your other browsers. If you lose it, the encrypted copy cannot be opened.',
      ru: '<strong>Обязательное поле.</strong> Придумайте любой пароль (это не пароль от GitHub). Он шифрует данные; в других браузерах введите тот же. Если вы его потеряете, зашифрованную копию не открыть.'
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
