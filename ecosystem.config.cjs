module.exports = {
  apps: [
    {
      name: 'tgloader', // Название проекта
      script: 'src/index.js', // Путь к файлу запуска
      cwd: __dirname, // Текущая директория
      interpreter: 'node', // Интерпретатор Node.js
      instances: 1, // Количество инстансов
      exec_mode: 'fork', // Режим выполнения
      autorestart: true, // Автоматический перезапуск
      watch: false, // Отслеживать изменения в файлах
      max_restarts: 10, // Максимальное количество перезапусков
      min_uptime: '10s', // Минимальное время работы
      restart_delay: 5000, // Задержка перезапуска
      kill_timeout: 15000, // Таймаут убийства процесса
      max_memory_restart: '512M', // Максимальный объем памяти для перезапуска
      error_file: 'logs/pm2-error.log', // Путь к файлу ошибок
      out_file: 'logs/pm2-out.log', // Путь к файлу вывода
      merge_logs: true, // Объединять логи
      time: true, // Включить время в логах
      env: {
        NODE_ENV: 'production', // Среда выполнения
        LOG_PRETTY: '0', // Форматирование логов
      },
    },
  ],
}
