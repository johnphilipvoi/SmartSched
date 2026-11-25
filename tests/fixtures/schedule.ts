// Transcription of the supplied Monday–Friday timetable.
export const scheduleGrid:string[][]=[
 ['Day/Time','Monday','Tuesday','Wednesday','Thursday','Friday'],
 ['7:30 - 8:00','','ITM 123','','ITE 107',''],
 ['8:00 - 8:30','','Comp Lab 2','','Rm.309',''],
 ['8:30 - 9:00','','Mr. JJ Baroro','','Mr. JG Garcia',''],
 ['9:00 - 9:30','','ITM 123','','ITE 107',''],
 ['9:30 - 10:00','','Comp Lab 2','','Rm.309',''],
 ['10:00 - 10:30','','Mr. JJ Baroro','','Mr. JG Garcia',''],
 ['10:30 - 11:00','CAP 102','CAP 102','','ITM 113',''],
 ['11:00 - 11:30','Rm.309','Rm.309','','Com Lab 2',''],
 ['11:30 - 12:00','Mr. RD Magboo','Mr. RD Magboo','','Mr. RD Magboo',''],
 ['12:00 - 12:30','','','','',''],
 ['12:30 - 1:00','','','','',''],
 ['1:00 - 1:30','ITM 113','','','',''],
 ['1:30 - 2:00','Com Lab 2','','','',''],
 ['2:00 - 2:30','Mr. RD Magboo','','','',''],
 ['2:30 - 3:00','','','','',''],
 ['3:00 - 3:30','','','','',''],
 ['3:30 - 4:00','','','','',''],
 ['4:00 - 4:30','','','','',''],
 ['4:30 - 5:00','','','','',''],
 ['Adviser:','Mr. Ralph Daryl S. Magboo','','','','']
];
export const expected=[
 [1,'10:30','12:00','CAP 102','Rm.309','Mr. RD Magboo'],
 [1,'13:00','14:30','ITM 113','Com Lab 2','Mr. RD Magboo'],
 [2,'07:30','09:00','ITM 123','Comp Lab 2','Mr. JJ Baroro'],
 [2,'09:00','10:30','ITM 123','Comp Lab 2','Mr. JJ Baroro'],
 [2,'10:30','12:00','CAP 102','Rm.309','Mr. RD Magboo'],
 [4,'07:30','09:00','ITE 107','Rm.309','Mr. JG Garcia'],
 [4,'09:00','10:30','ITE 107','Rm.309','Mr. JG Garcia'],
 [4,'10:30','12:00','ITM 113','Com Lab 2','Mr. RD Magboo'],
];
