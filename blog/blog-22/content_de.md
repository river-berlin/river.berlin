> As fun as AI is, we built so much bad software over the last 30 years, and now the universe is punishing us for our sins.

[source](https://simonwillison.net/2026/Oct/22/armin-ronacher/) 

<p class="text-sm">Notiz: Die Quelle verweist auf die Website von Simon Willison, der selbst einen Link zu X benutzt. Ich habe kein Interesse, einen Link zu X zu benutzen, weil es einer faschistischen Person gehört.</p>

Offensichtlich gibt es eine Junior-Entwickler-Krise jetzt, und ganz viele Softwareentwickler haben ihre Jobs verloren, weil Unternehmen glauben, dass wir [Softwareentwickler mit KI ersetzen können](https://digitaleconomy.stanford.edu/project/indicators/canaries-dashboard/)

Aber hier ist die Behauptung, die ich mache. Ich glaube, KI hat das "altes Softwareentwicklungmodell" ersetzt, aber niemand kann das alte Modell noch nutzen.

Erstmal, Obwohl wir in der Vergangenheit Checks für Linting, Test-driven Development, CI/CD usw hatten, ist die Wirklichkeit, dass nicht jeder Entwickler das tatsächlich ernst benutzt hat. In den meisten Fällen liegt das an der geringen Zeit oder Investition, die die firma hat.

Ich finde das total interessant, weil Menschen in der vergangenheit für eine lange ziet Slop-Code geschrieben haben (oder KI würde Sloppy-Code nicht schreiben), und wir haben schlechte softwareübungen noch für ganz viel Zeit benutzt.

Glaubst du mir nicht? Hier ist der bewies.

Erinnerst du dich [an die alten Twitch-Source-Code-Leak](https://apiiro.com/blog/what-we-learned-from-the-twitch-code-leak-about-application-security-programs/)?, Bei diesem Leak haben die Entwickler :

1. AWS-Credentials direkt in den quellecode geschrieben.
2. Twitch-Client-Secrets and Zugangtokens direkt in eine Testdatei geschrieben.
3. Einen privaten kryptografischen Schlüssel direkt ins Repo geschrieben.
4. Einen Google-API-Schlüssel direkt ins Repo geschrieben.
5. Ein Datenbankpasswort direkt in eine Terraform-Konfigurationsdatei geschrieben.
6. BGP-Authentifizierungspasswörter in Konfigurationsdateien geschrieben.

Oder Erinnerst du dich an die [codebase für Black](https://github.com/psf/black/blob/6bedb5c58a7d8c25aa9509f8217bc24e9797e90d/black.py), wenn das eine vollig ungetrenter Alptraum war.

Oder als [Über Admin-schlussel mit Admin priviledges direkt an der Quelledateien repository geschrieben hat, zweimal, einmal 2014 und einmal 2016.](https://www.ftc.gov/business-guidance/blog/2018/04/ftc-addresses-ubers-undisclosed-data-breach-new-proposed-order?utm_source=chatgpt.com)

Oder als [Equifax seine administrativen Credentials in Plaintext in ein repo geschrieben hat](https://www.ftc.gov/business-guidance/blog/2019/07/575-million-equifax-settlement-illustrates-security-basics-your-business?utm_source=chatgpt.com)

In einer welt, in der Agents ernste software CVEs [allein durch das Gerücht darüber](https://anil.recoil.org/notes/rumour-is-the-exploit) finden können, werden diese nachlässigen Praktiken nicht funktioniern.

Die durchschnittliche Zeit [um eine Exploit anhand eines Patches zu entdecken, ist jetzt minus 7 Tage](https://anil.recoil.org/notes/rumour-is-the-exploit), sicherlich, Wenn ein Fehler passiert, zum Beispiel wenn dein quellcode geleakt wird, gibt es eine hoches wahrscheinlichkeit, dass ganz viele agents das automatisch analysieren und automatisch alle Fehler so schnell wie möglich finden würden.

Das schafft einen starken Bedarf, für etwas über das wenig gesprochen wird, und das ist _verantwortliche Software_. Es geht darum, Menschen eine verantwortungsvolle Denkweise bei der Softwareentwicklung zu vermitteln.

Wir versuchen, das mit „harnesses” erzusetzen, [Wir scheitern](https://lucumr.pocoo.org/2026/9/7/astra-why/)

KI wird slop schreiben, fehlervollig code schreiben, und unsicher code schreiben, es sei dann du hast ganz viel Aufmerksamkeit. 

Die Zukunft für software entwicklung ist _Verantwortliche Software_, mit Entwicklern die wissen, was richtig ist und was nicht richtig ist. und die dabei auch mal arschloch sind, wenn es darum geht, über die Richtigen dinge zu tun. Wir können nicht in der Zeit züruckreisen, in eine vergangenhiet ohne KI, aber wir können definitiv verantwortlichvoll damit umgehen.
