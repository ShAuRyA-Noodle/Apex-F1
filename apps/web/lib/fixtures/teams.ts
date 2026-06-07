export type TeamFixture = {
  slug: string;
  name: string;
  fullName: string;
  base: string;
  principal: string;
  powerUnit: string;
  foundedYear: number;
  colorHex: string;
  championships: number;
};

export const teams2026: TeamFixture[] = [
  { slug: 'red-bull-racing', name: 'Red Bull', fullName: 'Oracle Red Bull Racing', base: 'Milton Keynes, UK', principal: 'Christian Horner', powerUnit: 'Honda RBPT', foundedYear: 2005, colorHex: '#0600EF', championships: 6 },
  { slug: 'mclaren', name: 'McLaren', fullName: 'McLaren Formula 1 Team', base: 'Woking, UK', principal: 'Andrea Stella', powerUnit: 'Mercedes', foundedYear: 1966, colorHex: '#FF8000', championships: 9 },
  { slug: 'ferrari', name: 'Ferrari', fullName: 'Scuderia Ferrari', base: 'Maranello, Italy', principal: 'Frédéric Vasseur', powerUnit: 'Ferrari', foundedYear: 1929, colorHex: '#DC0000', championships: 16 },
  { slug: 'mercedes', name: 'Mercedes', fullName: 'Mercedes-AMG PETRONAS F1 Team', base: 'Brackley, UK', principal: 'Toto Wolff', powerUnit: 'Mercedes', foundedYear: 1954, colorHex: '#00D2BE', championships: 8 },
  { slug: 'aston-martin', name: 'Aston Martin', fullName: 'Aston Martin Aramco F1 Team', base: 'Silverstone, UK', principal: 'Mike Krack', powerUnit: 'Mercedes', foundedYear: 2021, colorHex: '#006F62', championships: 0 },
  { slug: 'alpine', name: 'Alpine', fullName: 'BWT Alpine F1 Team', base: 'Enstone, UK', principal: 'Oliver Oakes', powerUnit: 'Renault', foundedYear: 2021, colorHex: '#0090FF', championships: 2 },
  { slug: 'williams', name: 'Williams', fullName: 'Williams Racing', base: 'Grove, UK', principal: 'James Vowles', powerUnit: 'Mercedes', foundedYear: 1977, colorHex: '#005AFF', championships: 9 },
  { slug: 'rb', name: 'RB', fullName: 'Visa Cash App RB', base: 'Faenza, Italy', principal: 'Laurent Mekies', powerUnit: 'Honda RBPT', foundedYear: 2024, colorHex: '#1E41FF', championships: 0 },
  { slug: 'sauber', name: 'Sauber', fullName: 'Stake F1 Team Kick Sauber', base: 'Hinwil, Switzerland', principal: 'Mattia Binotto', powerUnit: 'Ferrari', foundedYear: 1993, colorHex: '#900000', championships: 0 },
  { slug: 'haas', name: 'Haas', fullName: 'MoneyGram Haas F1 Team', base: 'Kannapolis, USA', principal: 'Ayao Komatsu', powerUnit: 'Ferrari', foundedYear: 2016, colorHex: '#FFFFFF', championships: 0 },
];
