import { ApiReciters, Reciter } from '../models/reciter.model';

export const MOCK_RECITERS: Reciter[] = [
  { id: 1, name: 'Abdul Basit Abdul Samad', recitations_count: 3 },
  { id: 2, name: 'Mishary Rashid Alafasy', recitations_count: 5 },
  { id: 3, name: 'Mahmoud Khalil Al-Husary', recitations_count: 4 },
  { id: 4, name: 'Mohamed Siddiq El-Minshawi', recitations_count: 2 },
  { id: 5, name: 'Saad Al-Ghamdi', recitations_count: 3 },
  { id: 6, name: 'Yasser Al-Dosari', recitations_count: 2 },
  { id: 7, name: 'Hani Ar-Rifai', recitations_count: 1 },
  { id: 8, name: 'Nasser Al-Qatami', recitations_count: 2 },
  { id: 9, name: 'Maher Al-Muaiqly', recitations_count: 4 },
  { id: 10, name: 'Ali Abdur-Rahman Al-Huthaify', recitations_count: 2 },
  { id: 11, name: 'Abdul Rahman Al-Sudais', recitations_count: 3 },
  { id: 12, name: 'Abdullah Basfar', recitations_count: 2 },
  { id: 13, name: 'Abdullah Yusuf Ali', recitations_count: 4 },
  { id: 14, name: 'Ahmed Ar-Rifaie', recitations_count: 2 },
  { id: 15, name: 'Ahmed Shafiq', recitations_count: 3 },
  { id: 16, name: 'Ahmed Yassin', recitations_count: 2 },
  { id: 17, name: 'Abdullah Al-Mousa', recitations_count: 2 },
  { id: 18, name: 'Abdullah Al-Hakim', recitations_count: 2 },
  { id: 19, name: 'Abdullah Al-Jaziri', recitations_count: 2 },
  { id: 20, name: 'Abdullah Al-Qahtani', recitations_count: 2 },
];

export const MOCK_API_RECITERS: ApiReciters = {
  results: MOCK_RECITERS,
  count: MOCK_RECITERS.length,
};
