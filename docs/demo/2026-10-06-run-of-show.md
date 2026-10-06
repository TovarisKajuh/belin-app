# Potek sestanka, torek 6. 10. 2026 ob 16:00

Za Jana, ki govori. Slovenščina, vikanje, 40 minut, v živo pri kupcu. Kupec je slovenski EPC izvajalec. Pokažete dvoje: **AVESOL** kot montažnega podizvajalca, ki ga lahko najame, in **Belin** kot orodje, ki ga lahko da vsem svojim podizvajalcem, ne samo AVESOL-u.

Vse teče na produkciji (getbelin.com; če domena na vaji še ne kaže Belina, belin-app.vercel.app), vstop skozi predstavitvena vrata (odločitev D1). Naročnik v demu je izmišljeno podjetje »Lumora Energija d.o.o.«, razen če je demo za sestanek personaliziran s kupčevim imenom. Imena oseb in projektov spodaj so iz seeda. Plonk listek (docs/demo/2026-10-06-cheat-sheet.html) je statičen in ne bere iz baze: zneske, številko objave za povrnitev in ime dostopne točke vanj vpišete s svinčnikom na vaji, ključa vrat pa nikoli. Če se zaslon in ta dokument razlikujeta v imenu ali številki, velja zaslon: bere iz baze.

**Jutranji rez (6. 10., 9:00).** Gradnja se je začela zjutraj, zato je del načrtovanega prestavljen na čas po sestanku. Spodaj je kot glavna pot že zapisana rezervna rešitev za vse, česar danes ni:

- registracije kupca v sobi ni (Wave 4): v točki 9 poveste, da mu Belin odprete vi po sestanku;
- člena o režijskih urah v naročilnici ni (Task 6.4m) in PDF-ja za dodatno delo ni (Task 6.6);
- količin v poročilu ekipe ni mogoče tipkati in gumba »Kot včeraj« ni (Task 5.9): količine se nastavljajo s tipko +, v korakih po 10;
- načrta ni mogoče spustiti v okvir (Task 4.5d): kliknete gumb v okvirju in izberete datoteko;
- ročnega vnosa projekta brez načrta ni (Task 4.5b), novi projekt iz načrta še nima delov za napredek in lokacije za vreme (Task 4.5a, 4.5c);
- preklopa projekta in menija z začetnicami na vrhu zaslona ni (Task 5.4);
- skripte za plonk listek (del Task 9.2), preflighta (Task 9.1) in mape BELIN OFFLINE (Task 9.3) ni: plonk listek izpolnite na roke, mapo pripravite sami, namesto preflighta velja ročni seznam preverjanj orkestratorja.

Na vaji preverite še tri stvari, ki se gradijo danes dopoldne in morda ne pridejo pravočasno: zlati gumb za preklop vloge (Task 2.3c, točka 6), gumb »Potrdi podpis« (Task 3.1b, točka 7c) in naslova ter obdobje storitve na računu (Task 3.3, točka 7d). Kar na vaji ne dela, prečrtate in uporabite rezervno vrstico.

Oznake ravni pri odgovorih (docs/gtm/INDEX.md): **FACT** preverjeno z virom in datumom, **PATTERN** vzorec iz navedenih virov, **J** presoja, ki jo po sestanku ocenimo v docs/gtm/field-log.md.

Kar baza docs/gtm danes NIMA: datoteke o ceni in pilotu (craft-offer-and-pilot.md) in o predstavitvi in zaključku (craft-demo-and-close.md). Vse o ceni, pilotu in zaključku je zato J.

## Pred začetkom: kaj je kje ob 15:55

| Naprava | Kdo jo drži | Kaj je odprto |
|---|---|---|
| Prenosnik, Chrome profil »Belin EPC« | vi | Zavihek 1: portfelj kot **Naročnik** (pisarna EPC, v seedu Marko Golob). Zavihek 2: predstavitvena vrata, pripet. Povečava 125 %, če je v sobi zaslon. |
| Prenosnik, Chrome profil »Belin podizvajalec« | vi | Seznam projektov kot **Podizvajalec** (pisarna AVESOL, v seedu Boštjan Novak). |
| Prenosnik, Fotografije | vi | Prva fotografija AVESOL, anlage-weit.jpg, celozaslonsko. To je prvo, kar kupec vidi. Fotografije so v C:\DevEnv\belin-app\assets\marketing\site\; mape BELIN OFFLINE skripta danes ne sestavi (Task 9.3a), zato jih v mapo kopirate sami, v vrstnem redu iz točke 1. |
| Vaš iPhone | vi, rezerva za kupca | Ikona Belin na začetnem zaslonu, prijavljen kot **Ekipa** (v seedu Luka Zupan). Ne moti vklopljen. Osebna dostopna točka pripravljena. |
| Kupčev telefon | kupec | Nič. V točkah 4 in 5 skenira gostujoči QR in je gost ekipe. |
| Na mizi, obrnjeno | vi | Natisnjeni zapisnik, račun, ena stran dnevnega poročila (vse z vaje; PDF-je po vaji prenesete in natisnete ročno, ker zbirnik Task 9.3b danes ne teče), pilotni dogovor v dveh izvodih. Plonk listek ostane v vaši mapi. |

Pravilo za vse točke: ko se zaslon ne premakne, **ne osvežujte strani**. Počakajte tri sekunde in znova kliknite zavihek. Reči: »Shranjeno je, zaslon se ujame.«

## Časovne točke (uro gledate na plonk listku)

- Pri 14:00 še niste v točki 5: točko 5c samo omenite.
- Pri 21:00 še niste v točki 6: točko 6 povejte brez preklopa (»Vsako podjetje vidi samo svoje projekte, strežnik to preveri ob vsakem odprtju.«) in pojdite na 7.
- Pri 27:00 še niste v 7c: 7b pokažite iz natisnjene kopije, prevzem naredite v živo.
- Pri 30:00 še niste v 7d: račun pokažite natisnjen, ne generirajte ga.
- Pri 32:00 zaprite prenosnik in začnite točko 8, karkoli je še odprto. Točki 8 in 9 se ne krajšata: brez datuma ne vstanete.

## Minuta za minuto

### 1. AVESOL, kdo smo (0:00 do 2:00)

- **Naprava in oseba:** prenosnik, Fotografije. Brez aplikacije.
- **Projekt:** brez.
- **Kaj naredite:** pokažete prvih pet (elektrarna, streha, trije posnetki gradnje: anlage-weit, dach-weit, flug-1-unterkonstruktion, flug-2-halbzeit, flug-3-fertig), nato dve z ekipo (crew-montage, crew-module). Puščica desno.
- **Kaj rečete:**
  »Najprej, kdo sem. Sem Jan iz AVESOL-a. Smo montažno podjetje: postavljamo sončne elektrarne na poslovnih in industrijskih strehah, kot podizvajalec za EPC izvajalce v Sloveniji, Avstriji in Nemčiji. To so naše strehe in naše ekipe.«
  »Na teh gradbiščih sedim na drugi strani mize kot vi. Jaz sem tisti, ki pošilja liste z urami in čaka na prevzem. Zato sem naredil Belin.«
  »Danes vam pokažem dvoje: AVESOL kot podizvajalca, ki ga lahko najamete, in Belin, orodje, ki ga lahko date vsem svojim podizvajalcem, ne samo nam.«
- **Kaj kupec vidi:** resnične fotografije AVESOL gradbišč.
- **Če ne gre:** fotografije se ne odprejo. »Raje vam pokažem v živo.« Zaprite in pojdite na točko 2.

### 2. Problem v kupčevih besedah (2:00 do 6:00)

- **Naprava in oseba:** brez zaslona. Zaprite fotografije, prenosnik naj kaže portfelj (Naročnik) ali nič.
- **Projekt:** brez.
- **Kaj naredite:** vprašate in poslušate. Na hrbtno stran plonk listka zapišete njegove besede **dobesedno**: potrebujete jih za field-log.
- **Kaj rečete:**
  »Preden kar koli pokažem: kje vas pri sodelovanju s podizvajalci danes najbolj stane? Pri urah, pri dodatnih delih, pri prevzemu ali pri papirjih na koncu?«
  (Poslušajte. Ne prekinjajte. Ne branite ničesar.)
  »Ali gradite tudi v Avstriji ali Nemčiji?«
  Nato ponovite njegove besede: »Torej, če prav razumem, vas najbolj stane to, kar ste rekli. Točno to vam pokažem.«
- **Kaj kupec vidi:** vas, ne zaslona. Ta del je njegov.
- **Če ne zna povedati:**
  »Pri nas je skoraj vedno isto. Denar se ne izgubi na strehi, ampak tri mesece pozneje, pri obračunu: ure, ki jih nihče ni potrdil, dodatno delo brez papirja in prevzem, napisan po spominu.« (J, iz docs/gtm/knowledge/market-icp-si.md, razdelek 2: prodajamo zaščito denarja, ne prihranek časa.)
- **Če gradi v AT ali DE:** zapomnite si. Pri točki 4 omenite, da trezor podizvajalca hrani A1 in Freistellungsbescheinigung z opozorilom pred potekom. Avstrijske in nemške odgovornosti plačnika danes NE obljubljajte kot funkcije.

### 3. Načrt noter (6:00 do 9:00)

- **Naprava in oseba:** prenosnik, profil »Belin EPC«, **Naročnik**.
- **Projekt:** nov projekt iz načrta.
- **Kaj naredite:** Nov projekt. V okvirju »Naložite K2 načrt (PDF)« kliknite gumb **Izberite datoteko** in izberite forum1.pdf (v repozitoriju C:\DevEnv\belin-app\tests\fixtures\k2\forum1.pdf; če ste ga na vaji kopirali v mapo BELIN OFFLINE\k2\, od tam). Samo forum1.pdf: ne imenuje nobene osebe in nobenega podjetja, vsi drugi vzorčni načrti imenujejo resnične ljudi ali podjetja. Ali kupčev načrt, če ga je poslal po Task 0.7 in ste ga preizkusili na vaji. Datoteke ne vlecite v brskalnik: spuščanja v okvir danes ni (Task 4.5d), Chrome PDF odpre namesto čarovnika in čarovnik izgine pred kupcem. Klik deluje vedno. Ko se pregled izpolni, je naziv projekta »Bietigheim-Bissingen« (57 modulov, 26,02 kWp, dve strehi); preimenujte ga, npr. v »Strešna elektrarna Bietigheim«, popravite eno količino, izberite podizvajalca AVESOL, ustvarite.
- **Kaj rečete:**
  »Projekta ne tipkate. Naložite načrt iz K2, Belin prebere naslov, moč, strehe, število modulov in material. Vi samo pregledate in popravite, kar je treba.«
  »To je vzorčni načrt iz K2 Base, nemški projekt. Vaši se preberejo enako.«
  Po ustvarjanju: »Projekt je v portfelju, iz načrta in brez tipkanja.« (Stavka o delih za napredek in lokaciji za vreme danes ne recite: Task 4.5a in 4.5c sta po sestanku, novi projekt ju še nima.) Nato: »Za danes grem na projekt, ki je pripravljen na prvi dan.« Odprite **Dan 1** (v seedu Poslovni park Ljubljana Vzhod).
- **Kaj kupec vidi:** prazen obrazec, ki se izpolni sam, nato nov projekt v portfelju.
- **Če ne gre:** nalaganje traja več kot 15 sekund ali javi napako. »Pokažem vam na projektu, ki je že pripravljen.« Odprite Dan 1.
- **Če kupec ne uporablja K2:** »Projekt lahko vnesete tudi brez načrta; v pilotu ga vneseva skupaj.« (Gumba »Brez načrta?« danes ni: Task 4.5b je po sestanku.)

### 4. Prvi dan: material s kupčevim telefonom (9:00 do 14:00)

- **Naprava in oseba:** prenosnik (Naročnik, Dan 1) in **kupčev telefon** kot gost ekipe (odločitev D18). Nikoli mu ne pokažite prave povezave za ekipo.
- **Projekt:** Dan 1.
- **Kaj naredite:** v pripetem zavihku vrat v razdelku »Telefon za goste« (pod kodo QR) kliknite **Dan 1** (privzeta koda odpre Trenutno): stran izriše novo kodo, veljavno 15 minut. Pomaknite se do razdelka »Telefon za goste«, da je na zaslonu samo koda, in pritisnite **F11**, da naslovna vrstica s ključem vrat ni vidna. Kupec skenira kodo s kamero in je brez vpisa na Dan 1 kot ekipa (v seedu Miha Oblak): »Najprej preverite material«. Nato F11 znova in nazaj na Dan 1 kot Naročnik.
- **Kaj rečete:**
  »Vzemite svoj telefon in skenirajte to kodo. Brez aplikacije, brez gesla. Zdaj ste vi ekipa na strehi, prvi dan.«
  »Tapnite Vse prispelo. Zdaj eno vrstico označite Delno in vpišite, koliko manjka. Fotografirajte dobavnico, lahko kar ta list na mizi. Tapnite Potrdi preverjanje.« (Delno samo, če je Task 5.10 na produkciji: na vaji preverite, da se stran po tapu na Delno ne razširi vstran; sicer: »Tapnite Vse prispelo. Fotografirajte dobavnico, lahko kar ta list na mizi. Tapnite Potrdi preverjanje.«)
  Na prenosniku: »To vidim jaz v pisarni, v nekaj sekundah, brez klica. Prvi dan veste, česa ni, takrat ko je to še poceni, in ne tretji teden, ko ekipa stoji.«
- **Kaj kupec vidi:** na svojem telefonu pregled materiala; na prenosniku ploščo materiala s primanjkljajem, fotografijama in uro preverjanja.
- **Če ne gre:** QR ne odpre ali kupec noče skenirati. Dajte mu svoj iPhone, ikona Belin: »Vzemite moj telefon, je isto.« Če prenosnik po petih sekundah ne pokaže primanjkljaja: »Shranjeno je, zaslon se ujame.« Kliknite zavihek Dan 1 znova, ne osvežujte.

### 5. Sredina projekta: poročilo, ure, dodatno delo (14:00 do 21:00)

- **Naprava in oseba:** kupčev telefon (gost ekipe), nato prenosnik kot **Naročnik**.
- **Projekt:** **Trenutno** (v seedu PSE Trgovski center Kranj), dva tedna v delu.

**5a, dnevno poročilo (14:00).** V pripetem zavihku vrat pod »Telefon za goste« kliknite **Trenutno** (F11 kot v točki 4), kupec znova skenira kodo in je na Trenutno. Preklopa projekta na vrhu zaslona danes ni (Task 5.4 je po sestanku). Puščice nazaj v brskalniku ne uporabljajte: vodi skozi gostujočo povezavo. Na zavihku Poročaj pri eni postavki enkrat tapnite **+** (količina se premika v korakih po 10; tipkanja in gumba »Kot včeraj« danes ni, Task 5.9 je po sestanku), fotografirajte mizo, Pošlji poročilo.
- »Zdaj ste na projektu, ki teče že dva tedna. To je dnevno poročilo: količine, fotografija, pošlji. Trideset sekund, z eno roko.«
- Na prenosniku, Trenutno: »In jaz ga vidim takoj, z vašo fotografijo. Napredek se izračuna iz količin, ne iz ocene po telefonu.«
- **Kaj kupec vidi:** svoje poročilo na svojem telefonu, nato isto poročilo z isto fotografijo na prenosniku in premik napredka.
- **Če ne gre:** pošiljanje ne uspe na njegovem omrežju. Isto na vašem iPhonu.
- Ko je poročilo na prenosniku: na kupčevem telefonu gumb **Odjava** na zaslonu (menija z začetnicami danes ni, Task 5.4). Gostujoča seja sicer ostane dve uri na njegovem telefonu, kot ekipa v vašem demu.

**5b, režijske ure (16:00).** Prenosnik, Naročnik, Trenutno, Ure in dodatna dela, zavihek Režijske ure. List 2 kaže »še 2 dneva«.
- »To je list režijskih ur, ki ga je oddal podizvajalec. Vidite odštevanje: še dva dneva. Isto vidi podizvajalec.«
- »Rok šestih dni obe strani vidita, preden se delo začne. V pilotu ga zapiševa v vašo naročilnico.« (Člena o režijskih urah v naročilnici danes ni, Task 6.4m je po sestanku: naročilnice za ta stavek ne odpirajte.)
- Kliknite Potrdi na listu 2. »Potrjeno, podizvajalec je obveščen. Te ure niso več tema za obračun.« (Skupno število potrjenih ur je na plonk listku, vrstica Režija.)
- **Kaj kupec vidi:** odštevanje na listu, nato list v stanju Potrjeno.
- **Če ne gre:** potrditev javi napako. »Stanje se je medtem spremenilo«, kliknite zavihek Režijske ure znova; list je morda že potrjen.

**5c, dodatno delo (19:00).** Ure in dodatna dela, zavihek Dodatna dela: potrjeno dodatno delo (v seedu »Popravilo poškodovane hidroizolacije«, znesek na plonk listku). PDF-ja za dodatno delo danes ni (Task 6.6 je po sestanku): pokažete ga na zaslonu.
- »Dodatno delo ima opis, ceno in odločitev z datumom. Na račun pride samo, ne da bi ga kdo prepisoval.«
- **Kaj kupec vidi:** dodatno delo z zneskom in datumom odločitve.
- **Če ne gre:** zavihek se ne odpre. Povejte stavek brez zaslona in pojdite na točko 6.

### 6. Kdo vidi kaj: konflikt interesov (21:00 do 24:00)

- **Naprava in oseba:** prenosnik, profil »Belin EPC«. Preklop vloge obstaja samo, če je Task 2.3c na produkciji (na vaji preverite, ali je spodaj desno zlati gumb). Če je: spodaj desno kliknite zlati gumb, ki kaže »Naročnik, vodstvo«, in izberite **Podizvajalec, pisarna**; gumb je viden samo, če je ta profil vstopil skozi predstavitvena vrata. **Če gumba ni:** Alt+Tab na okno profila »Belin podizvajalec«, ki je že na seznamu AVESOL, in na koncu Alt+Tab nazaj na »Belin EPC«.
- **Projekt:** portfelj, projekt v Velenju (v seedu »Industrijska streha Velenje«, podizvajalec Montaža Kos; ime na plonk listku, vrstica Velenje).
- **Kaj naredite:** na portfelju kot Naročnik pokažite projekt v Velenju in njegovega podizvajalca. Preklopite na »Podizvajalec, pisarna« (ali Alt+Tab na »Belin podizvajalec«). Prikaže se seznam AVESOL: Trenutno, Dan 1, en zaključen projekt in projekt iz točke 3, če ste ga ustvarili z AVESOL. Velenja ni. Preklopite nazaj na »Naročnik, vodstvo« (ali Alt+Tab nazaj na »Belin EPC«).
- **Kaj rečete (vprašanje postavite VI, preden ga on):**
  »Zdaj vprašanje, ki ga imate verjetno v glavi. Jaz vodim montažno podjetje. Ali AVESOL v Belinu vidi vaše druge podizvajalce in njihove cene? Poglejva.«
  »To je pogled AVESOL-a. Projekta v Velenju ni, ker ga je delal drug podizvajalec. Ne zato, ker bi ga jaz skril, ampak ker ga strežnik ne izda nikomur, ki na projektu ni stranka. Vsako podjetje vidi samo svoje projekte.«
  »In da bo jasno: kot ponudnik Belina ima AVESOL d.o.o. tehnični dostop do baze, kot ga ima vsak ponudnik programske opreme v oblaku. Za podatke vaših projektov ste upravljavec vi, mi smo obdelovalec. Pogodbo o obdelavi osebnih podatkov podpiševa pred začetkom pilota, v pilotni dogovor pa vam zapišem, da AVESOL podatkov iz Belina ne uporablja za svoje ponudbe.«
- **Kaj kupec vidi:** dva različna seznama na istem prenosniku.
- **Če ne gre:** preklop se ne zgodi. Alt+Tab na okno »Belin podizvajalec«, ki je že na seznamu AVESOL.

### 7. Papirji na koncu (24:00 do 32:00)

- **Projekt:** Trenutno.

**7a, predaja (24:00).** Okno »Belin podizvajalec«, **Podizvajalec**: Trenutno, Zaključek, Zaključi projekt, potrdite.
- »Podizvajalec sporoči, da je delo končano. Vi ste obveščeni.«
- **Kaj kupec vidi:** na kartici Predaja »Zaključek zahtevan« z današnjim datumom.

**7b, zaključno poročilo (25:00).** Okno »Belin EPC«, **Naročnik**: Trenutno, Zaključek, Ustvari poročilo. Ko se pokaže Prenesi poročilo, ga odprite. Listajte: naslovnica, strani po dnevih, današnja stran s fotografijo mize.
- **Kaj kupec vidi:** večstranski PDF, na zadnji dnevni strani svojo fotografijo.
- »Zaključno poročilo: vsak dan svoja stran, vreme, fotografije, količine, potem ure, dodatna dela in zapleti. In tukaj je današnji dan, z vašo fotografijo mize od pred desetimi minutami. Tega ni nihče tipkal.«
- Če list 2 v točki 5b ni bil potrjen: o seštevku ur v poročilu ne govorite. Poročilo danes šteje tudi nepotrjene ure (Task 3.4 je po sestanku), račun v 7d pa samo potrjene, zato bi se številki razlikovali.
- **Če ne gre:** nalaganje traja. Govorite o naslovnici. Po 30 sekundah: natisnjena kopija z mize (z vaje). Ogrevanja poročila pred sestankom danes ni (preflight, Task 9.1, je po sestanku).

**7c, zapisnik o prevzemu (27:00).** Naročnik: Začni prevzem. Končni prevzem. Prisotni: kupčevo ime in vaše ime. Dodaj pomanjkljivost: »Manjka oznaka na razdelilniku R2«, rok čez 14 dni, Usklajeno. Izjava o prevzemu: **Prevzeto s pridržki**. Obkljukajte »Pridržim si pravico do pogodbene kazni«. Podpis naročnika: obrnite prenosnik h kupcu, »Vi podpišete kot naročnik«, vpiše svoje ime. Kliknite »Potrdi podpis« in počakajte na »Podpis je shranjen.« Podpis podizvajalca: podpišete vi, vpišete svoje ime in priimek. Kliknite »Potrdi podpis« in počakajte na »Podpis je shranjen.« Ko sta shranjena oba podpisa, kliknite Podpiši in zaključi prevzem. Prenesi zapisnik.
- **Samo če na vaji gumba »Potrdi podpis« NI** (Task 3.1b ni na produkciji): stara blazinica shranjuje ob vsaki potezi na isto mesto in PDF lahko pokaže samo prvo potezo, zato se oba podpišeta z eno samo potezo, brez dviga prsta, in na vaji preverite podpis v PDF-ju. Če je podpis v PDF-ju okrnjen, pokažite natisnjeni zapisnik z vaje.
- **Kaj kupec vidi:** svoj podpis na zaslonu, nato v PDF zapisniku z vašim, pomanjkljivost z rokom in stavek o pridržku.
- »Zapisnik o prevzemu, z obema podpisoma, s pomanjkljivostjo in rokom za odpravo. Pridržek pogodbene kazni je izpisan dobesedno. To je stavek, ki vam ohrani pravico: brez njega ob prevzemu pravica do pogodbene kazni zaradi zamude ugasne. In prav ta stavek se v zapisniku po spominu najprej izgubi.« (FACT, 251. člen OZ, glejte kartico 11.)
- **Če ne gre:** podpis se ne shrani ali PDF ne nastane. Pokažite natisnjeni zapisnik z mize: »To je isti dokument z današnje vaje.«

**7d, račun (30:00).** Okno »Belin podizvajalec«, **Podizvajalec**: Trenutno, Zaključek, kartica Račun, Ustvari račun, Prenesi račun.
- »Račun se sestavi sam: sprejeta naročilnica, potrjene ure in potrjeno dodatno delo. Ker gre za gradbene storitve med podjetjema, ki sta v Sloveniji identificirani za DDV, velja obrnjena davčna obveznost po 76.a členu ZDDV-1, zato vrstice DDV ni.«
- »Nihče ni ničesar tipkal. Vse so podatki s strehe.«
- **Kaj kupec vidi:** račun AVESOL z naslovoma obeh podjetij, obdobjem storitve, rokom plačila, sklicem na naročilnico, urami in dodatnim delom ter stavkom o obrnjeni davčni obveznosti. (Naslovi, obdobje, rok in sklic so iz Task 3.3, ki se gradi danes dopoldne: na vaji jih preverite na PDF-ju. Česar ni, o tem ne govorite.)
- **Če ne gre:** natisnjeni račun z mize.

### 8. Ponudba (32:00 do 35:00)

- **Naprava in oseba:** brez zaslona. Zaprite prenosnik do polovice.
- **Kaj rečete:**
  »Predlog je preprost. En vaš resnični projekt, brezplačno, do podpisanega zapisnika o prevzemu. Ne štirinajst dni, ker streha traja tedne. Vaši podizvajalci ne plačajo nikoli. Vsakega vašega podizvajalca uvedem jaz, po telefonu.«
  »Po pilotu mesečni pavšal na podjetje, ki ga dogovoriva po prvem projektu, ko oba veva, koliko vam prihrani.«
  »In če želite, na ta projekt pridemo tudi z AVESOL-om kot montažna ekipa. To ni pogoj: Belin deluje s komerkoli od vaših podizvajalcev.«
- **Kaj kupec vidi:** vas. Če vpraša po pogojih, mu pokažite natisnjeni pilotni dogovor.
- **Raven:** J. Ponudba »do prevzema« namesto 14 ali 30 dni je presoja iz recon/market-benchmark (vzorec preizkusov pri Capmo, PlanRadar, Craftnote), ne preverjeno dejstvo o tem kupcu.

### 9. Zaključek: datum in pilotni dogovor (35:00 do 40:00)

- **Naprava in oseba:** brez zaslona. Natisnjeni pilotni dogovor (Task 9.5, dva izvoda; Task 8.2 na zaslonu danes ne gre v produkcijo). Registracije v sobi danes ni: samopostrežna registracija (Wave 4) pride po sestanku, zato kupčev Belin odprete vi.
- **Kaj naredite:** poveste, da mu njegov Belin po sestanku odprete sami in da prvi projekt vneseta skupaj. Na hrbtno stran plonk listka zapišete, kar za to potrebujete: ime podjetja, davčno številko in e-pošto osebe, ki bo prva v Belinu. Nato pilotni dogovor: projekt in datum začetka, podpišeta oba. Na koncu datum klica.
- **Kaj rečete:**
  »Vaš Belin vam po sestanku odprem jaz: vaše podjetje, prazno, vaše, nihče drug ga ne vidi. Vi ne izpolnjujete ničesar.«
  »Potrebujem samo ime podjetja, davčno številko in e-pošto osebe, ki bo prva v Belinu.«
  Pilotni dogovor: »Kateri projekt in kateri dan začnemo?« Vpišite projekt in datum začetka, podpišeta oba.
  Zadnji stavek, z datumom: »Pokličem vas v četrtek ob devetih, da skupaj vneseva projekt in povabiva vašega podizvajalca.« (Če se dogovorita drugače, velja dogovorjeno. Brez datuma ne vstanite: J, no-brainer ideja 42.)
- **Kaj kupec vidi:** vas in natisnjeni dogovor; na koncu dogovor s svojim projektom, datumom začetka in obema podpisoma.
- **Raven:** J. Odprtje računa namesto registracije v sobi je jutranji rez (registracija ni pripravljena), ne preizkušena izbira.
- **Če ne gre:**
  Kupec danes ne podpiše: dogovor pustite pri njem in se dogovorite za datum klica. Brez datuma ne vstanite.
  Kupec ne želi dati e-pošte za račun: »Pošljem vam jo v četrtek po klicu, ko izbereva projekt.« Datum klica velja enako.

## Lestev rezervnih rešitev

1. **Zaslon se ne premakne:** tri sekunde, znova kliknite zavihek, ne osvežujte. »Shranjeno je, zaslon se ujame.«
2. **Omrežje v prostoru:** prenosnik na osebno dostopno točko iPhona (ime na plonk listku).
3. **Napaka po objavi (samo pred sestankom, med sestankom nikoli):** Vercel, belin-app, Deployments, objava s plonk listka (zamrznjena objava, vpisana ob 12:00), meni, Instant Rollback. Na načrtu Hobby gre povrnitev samo na neposredno prejšnjo produkcijsko objavo (FACT, vercel.com/docs/deployments/rollback-production-deployment, dostop 2026-10-05), zato po zamrznitvi ni nobene objave razen odobrenih popravkov. Baze se nikoli ne povrača. Med sestankom: korak 4.
4. **Baza ali platforma ne dela:** natisnjeni dokumenti z mize in fotografije AVESOL. »Platforma ima danes slab dan, zato vam pokažem dokumente, ki jih je naredila danes popoldne.« Zaključno poročilo, zapisnik o prevzemu, račun. Starega videa ne kažite (posnet avgusta, kaže resnično slovensko podjetje kot naročnika) in brošure ne dajajte (obljublja delo na slabi povezavi, kar kartica 7 zanika): oboje popravi Task 9.3a, ki je po sestanku. Ponudba in zaključek (točki 8 in 9) gresta enako.

## Kartice z ugovori

Vsak odgovor povejte s svojimi besedami, a ne obljubite več, kot piše tukaj.

**1. »Koliko to stane?«**
»Pilot je brezplačen: en vaš resnični projekt, do podpisanega zapisnika o prevzemu. Podizvajalci ne plačajo nikoli. Po pilotu mesečni pavšal na podjetje, ki ga dogovoriva po prvem projektu. Cene vam danes ne povem na pamet, ker jo hočem vezati na to, kar vam prvi projekt prihrani.«
Raven: **J**. Baza docs/gtm nima datoteke o ceni. Za vašo glavo, ne za mizo: PlanRadar 26, 89 in 129 EUR na uporabnika na mesec, Craftnote 14,90 do 49,90 EUR na uporabnika na mesec (FACT, recon/market-benchmark, dostop 2026-10-05). Če ste v Task 0.6 h dali drug stavek, velja vaš.

**2. »Vi ste montažer. Zakaj bi vam dal svoje podatke?«**
»Pošteno vprašanje, zato sem ga postavil sam. Vsako podjetje v Belinu vidi samo projekte, na katerih je stranka; to ste videli pri Velenju. Tega ne preverja zaslon, ampak strežnik ob vsakem odprtju. Kot ponudnik Belina imamo tehnični dostop do baze, kot vsak ponudnik programske opreme v oblaku. Uporabljamo ga samo za delovanje, varnost in podporo, pogodbo o obdelavi osebnih podatkov pa podpiševa pred začetkom pilota. V pilotni dogovor zapišem, da AVESOL podatkov iz Belina ne uporablja za svoje ponudbe.«
Raven: **FACT** za ločitev (app/[locale]/app/[projectId]/page.tsx: requireProjectActor, kdor ni stranka na projektu, dobi »ne obstaja«; na vaji preverite, da Podizvajalec za Velenje dobi stran »ne obstaja«; preflight, Task 9.1, in test, Task 8.1, sta po sestanku). **J** za strategijo »povej prvi« (docs/gtm/knowledge/founder-groundtruth.md, razdelek 6) in za zavezo v dogovoru, ki jo potrdite pred sestankom.

**3. »Moji podizvajalci tega ne bodo uporabljali.«**
»Za njih je brezplačno, brez aplikacije iz trgovine in brez gesla. Poročilo je trideset sekund z eno roko, kot ste ga pravkar oddali sami. Vsakega vašega podizvajalca uvedem jaz, po telefonu. Če po dveh tednih kdo ne poroča, mi povejte in ga pokličem še isti dan.«
Raven: **PATTERN** (podizvajalci so brezplačni pri PlanRadar, Capmo, conova24, NachweisHub, recon/market-benchmark, dostop 2026-10-05: to je pričakovano, ne prednost). **J** za uvedbo po telefonu (Task 0.6 j) in za »trideset sekund« na tujem telefonu, dokler ga ne izmerimo.

**4. »Imamo Excel in WhatsApp. Deluje.«**
»Deluje, dokler se ne začne obračun. WhatsApp nima roka za potrditev ur, nima podpisa na prevzemu in ne sestavi računa. Belin ne zamenja klepeta, zamenja iskanje dokazil. Fotografija v skupini čez tri mesece ne pove, kateri dan, kateri projekt in kdo je kaj potrdil.«
Raven: **J** in **PATTERN** (lib/pdf/brochure-copy.ts, problem 3; docs/gtm/knowledge/market-icp-si.md, razdelek 2).

**5. »Kaj, če vas čez leto dni ni več?«**
»Vsak dokument, ki ga Belin ustvari, je PDF, ki ga prenesete in ostane vaš: poročila, zapisniki, računi. Podatki so v Evropski uniji, v Frankfurtu. Izvoza celotnega projekta v enem paketu danes še ni; v pilotni dogovor zapišem, da ga dobite ob koncu pilota ali kadarkoli na zahtevo.«
Raven: **FACT** za Frankfurt (baza Supabase v regiji eu-central-1, Supabase konektor get_project, 2026-10-05; funkcije v fra1, Frankfurt, vercel.com/docs/regions, dostop 2026-10-05, po Task 1.2; na vaji preverite, da lučka Strežnik na plošči vrat kaže regijo fra1, sicer recite samo »baza in datoteke so v Frankfurtu«). **FACT** da izvoza ni (recon no-brainer-ideas, ideja 27 ni narejena). **J** za zavezo.

**6. »Kaj pa GDPR?«**
»Za podatke vašega projekta ste upravljavec vi, ponudnik Belina je obdelovalec. Baza in datoteke so pri Supabase v Frankfurtu, aplikacija teče na Vercelu v Frankfurtu, e-pošto pošilja Resend s strežnikov na Irskem. Supabase ima od aprila 2026 certifikat ISO 27001. Pogodbo o obdelavi osebnih podatkov podpiševa pred začetkom pilota.«
Raven: **FACT**: stran /sl/zasebnost obstaja že danes in navaja Supabase (Frankfurt), Vercel in Resend kot obdelovalce (lib/legal-copy.ts; Task 4.8, ki jo dopolni, je po sestanku); aplikacija v Frankfurtu samo, če lučka Strežnik na plošči vrat kaže fra1 (Task 1.2), sicer ta del stavka izpustite; Supabase ISO/IEC 27001:2022 od 22. 4. 2026 (supabase.com/blog/supabase-is-now-iso-27001-certified, dostop 2026-10-05); fra1 je Frankfurt (vercel.com/docs/regions, dostop 2026-10-05); pošiljanje prek eu-west-1 (DNS zapis MX za send.getbelin.com kaže na feedback-smtp.eu-west-1.amazonses.com, recon 2026-10-05). **J**: pogodba o obdelavi za kupca še ne obstaja kot dokument; to je vaša zaveza.

**7. »Kaj, če na strehi ni signala?«**
»Belin za oddajo potrebuje povezavo. Stran je lahka, vendar brez signala poročila ne odda, dokler ekipa ni spet v dosegu. Dela brez povezave vam danes ne obljubljam.«
(Stavka o osnutku, ki se ne izgubi, danes ne recite: Task 8.3 je po sestanku.)
Raven: **FACT** (v repozitoriju ni service workerja ne čakalne vrste brez povezave, recon 2026-10-05; odločitev D12).

**8. »Od leta 2028 morajo biti računi e-računi.«**
»Drži. Od 1. 1. 2028 morajo biti vsi računi med slovenskimi podjetji strukturirani e-računi, PDF ne bo več dovolj. Belin danes račun sestavi iz potrjenih podatkov, kar je težji del. Izvoza v e-SLOG še ni. Narediti ga moramo pred letom 2028 in ga ne bom prodajal, dokler ga ni.«
Raven: **FACT** (ZIERDED; BDO, 2. 1. 2026, bdo.global, »slovenia-e-invoicing-to-be-mandatory-for-b2b-transactions-starting-in-2028«; OZS, »sprejet zakon o izmenjavi elektronskih računov«; oba dostop 2026-10-05). **J** za časovnico izvoza.

**9. »Ne uporabljamo K2.«**
»Belin danes sam prebere poročila iz K2 Base. Danes Belin potrebuje načrt v PDF; ročni vnos dodam pred vašim pilotom. Pošljite mi en načrt iz programa, ki ga uporabljate, in pogledam, ali ga lahko beremo enako.«
Raven: **FACT** za branje K2 (DECISIONS.md, 2026-07-20). **FACT** da ročnega vnosa brez načrta danes ni (gumb »Brez načrta?« je Task 4.5b, po sestanku). **J** za časovnico ročnega vnosa in za drug format.

**10. »Ali AVESOL vidi moje cene?«**
»AVESOL vidi samo naročilnice, ki ste jih poslali AVESOL-u, ker so to njegove pogodbe. Naročilnic in cen drugih podizvajalcev ne vidi; to ste videli pri Velenju. Velja tudi obratno: drug podizvajalec ne vidi cen AVESOL-a.«
Raven: **FACT** (app/[locale]/app/[projectId]/po/page.tsx: requireProjectActor, kdor ni stranka na projektu, dobi »ne obstaja«; preflight, ki bi to preveril, je Task 9.1, po sestanku).

**11. »Zakaj je pridržek pogodbene kazni tako pomemben?«** (če vpraša pri točki 7c)
»Ker upnik, ki sprejme izpolnitev in ne sporoči takoj, da si pridržuje pravico do pogodbene kazni, te pravice zaradi zamude ne more več zahtevati. Zapisnik o prevzemu je ravno trenutek, ko to sporočite.«
Raven: **FACT** (251. člen Obligacijskega zakonika, zakonodaja.com/zakon/oz/251-clen-upnikove-pravice, uradno besedilo na pisrs.si, ZAKO1263; dostop 2026-10-05). Ni pravni nasvet; pri sporu odloča pogodba.

## Po sestanku: vnos v docs/gtm/field-log.md

Napišete isti večer, dokler so besede še sveže. Kopirajte, izpolnite, dodajte na konec datoteke.

```
## 2026-10-06, predstavitev Belin in AVESOL pri slovenskem EPC izvajalcu
**Stood on:** docs/gtm/knowledge/market-icp-si.md razdelek 2 (denar, ne čas); founder-groundtruth.md razdelek 6 (konflikt povej prvi); recon market-benchmark, slovenski kaveljci; docs/demo/2026-10-06-run-of-show.md
**Did:** kdo je bil v sobi (vloge, ne imena, če niso dovolili); katere točke ste pokazali; kaj je kupec naredil sam (QR, poročilo, podpis); kaj je odpovedalo in katera rezerva je pomagala
**Result:** njegove besede pri točki 2, dobesedno; ugovori, ki jih je postavil, v njegovih besedah; ali je dal podatke za odprtje računa; ali je podpisal pilotni dogovor; projekt in datum začetka; dogovorjeni naslednji klic
**Verdict on the judgment:**
- J1 denar, ne čas, kot uvod: confirmed, weakened ali killed, in zakaj
- J2 konflikt interesov povej prvi in pokaži v živo: ...
- J3 pilot do prevzema namesto 14 ali 30 dni: ...
- J4 kupčev telefon v točki 4 in 5: ...
- J5 račun mu odprem jaz po sestanku, namesto registracije v sobi: ...
- J6 stavek o ceni: ...
- J7 obljuba, da podizvajalce uvedem po telefonu: ...
```

Neprijetna resnica, ki jo zapišete, če se je zgodila: če kupec ni dal datuma, zaključek ni uspel, ne glede na to, kako dober je bil občutek v sobi.
