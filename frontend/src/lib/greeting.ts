const brasiliaHour = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo', hour: '2-digit', hourCycle: 'h23',
});

export function getTimeGreeting(date = new Date()): 'Bom dia' | 'Boa tarde' | 'Boa noite' {
  const hour = Number(brasiliaHour.format(date));
  if (hour >= 5 && hour < 12) return 'Bom dia';
  if (hour >= 12 && hour < 18) return 'Boa tarde';
  return 'Boa noite';
}
