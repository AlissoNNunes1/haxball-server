
Chat Commands
Mario Carbajal edited this page on Mar 20, 2020 · 11 revisions
/avatar <avatartext>

Sets the player avatar text.
/clear_avatar

Clears the player avatar text, the player text will be his number.
/colors <team> <angle> <textcolor> <color1> <color2> <color3>

Changes the colors of a team. Only admins can use this command.

Colors are expressed in Hexadecimal RRGGBB, for example red is FF0000, green is 00FF00 and blue is 0000FF.

Arguments:

    team: The team for which colors will be set. Should be either red or blue.
    angle: The angle for the team color stripes. In degrees.
    textcolor: The color of the player avatars.
    color1: The first color for the team.
    color2: The second color for the team. This is optional, if omitted the team will have only 1 color (no stripes).
    color3: The third color for the team. This is optional, if omitted the team will have only 2 colors.

Example: /colors red 60 FFFFFF 0080FF 004077 002033
/colors <team> clear

Clears the colors of a team, resetting back to default colors. Only admins can use this command.
/checksum

Obtains a checksum of the current stadium, can be used to verify the loaded stadium if you know the checksum beforehand.
/store

Stores the current stadium of the room, the stadium will then appear in the stadium selection menu.
/set_password <password>

Sets the password for the room. Only the host can use this command.
/clear_password

Clears the password of the room. Only the host can use this command.
/recaptcha <on|off>

Activates or deactivates the recaptcha requirement to join the room. Only the host can use this command.
/clear_bans

Clears the banned player list. Only the host can use this command.
/handicap <milliseconds>

Adds a certain amount of milliseconds of lag to your client, this can be used to give yourself a disadvantage. It's useful for balancing when playing against someone with higher ping than you.
/extrapolation <milliseconds>

Causes the game to extrapolate by a certain amount of milliseconds. It can be used to counteract the effects of input delay but at the cost of extra "warping" in the game prediction.

It is recommended to leave this at 0 unless you have input delay.
/kick_ratelimit <min> <rate> <burst>

Set's the room's ball-kick ratelimit.

min is the minimum number of logic-frames between two kicks. It is impossible to kick faster than this.

rate works like min but lets players save up extra kicks to use them later depending on the value of burst.

burst is how many extra kicks a player can save up.

Example: /kick_ratelimit 2 15 3 If a player spams kick he'll kick every 2 frames for the first 4 kicks and after that he'll be limited to one kick every 15 frames ( which is 4 kicks per second ). If the player doesn't kick for 1 second he'll save enough for another burst of 4 kicks.
