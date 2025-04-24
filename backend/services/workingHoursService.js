// backend/services/workingHoursService.js

class WorkingHoursService {
  constructor() {
    // Valores padrão
    this.defaultWorkingHours = {
      start: "09:00",
      end: "18:00",
      timezone: "America/Sao_Paulo",
      weekdays: ["1", "2", "3", "4", "5"], // Segunda a sexta
    };
  }

  // Verificar se o momento atual está dentro do horário de trabalho
  isWithinWorkingHours(workingHours = null) {
    const settings = workingHours || this.defaultWorkingHours;

    try {
      // Obter data e hora atuais no timezone configurado
      const now = new Date();
      const options = { timeZone: settings.timezone };
      const formatter = new Intl.DateTimeFormat("en-US", {
        ...options,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });

      // Pegar o dia da semana (0 = domingo, 1 = segunda, ..., 6 = sábado)
      const dayOfWeek = now.getDay().toString();

      // Verificar se é um dia de trabalho
      if (!settings.weekdays.includes(dayOfWeek)) {
        return false;
      }

      // Extrair a hora atual no formato 24h
      const timeStr = formatter.format(now);
      const [hours, minutes] = timeStr.split(":").map(Number);
      const currentMinutes = hours * 60 + minutes;

      // Converter horário de início para minutos
      const [startHours, startMinutes] = settings.start.split(":").map(Number);
      const startTotalMinutes = startHours * 60 + startMinutes;

      // Converter horário de fim para minutos
      const [endHours, endMinutes] = settings.end.split(":").map(Number);
      const endTotalMinutes = endHours * 60 + endMinutes;

      // Verificar se a hora atual está dentro do intervalo de trabalho
      return (
        currentMinutes >= startTotalMinutes && currentMinutes <= endTotalMinutes
      );
    } catch (error) {
      console.error("Erro ao verificar horário de trabalho:", error);
      return true; // Em caso de erro, assumimos que está dentro do horário
    }
  }
}

module.exports = WorkingHoursService;
