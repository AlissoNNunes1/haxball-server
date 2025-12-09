
Linking to replay files
Mario Carbajal edited this page on Aug 3, 2019 · 5 revisions

You can link to replay files hosted in your own site. This kind of link will continue to work even between backwards-incompatible updates.
Example

https://www.haxball.com/replay?v=3#https://haxball.github.io/haxball-replays/sample_replay.hbr2
Link Anatomy

https://www.haxball.com/replay?v= replayer_version # url_to_replay_file

replayer_version: This is an integer that lets haxball know which replayer to use for this file, the version changes with each backwards incompatible update. Read below how find out the version of a .hbr2 file.

url_to_replay_file: This is the url to your .hbr2 file.
Obtaining the replay version of a .hbr2 file

The current version of .hbr2 files produced today is 3.

To obtain the version of any .hbr2 file you must read it's header as a binary file:
.hbr2 binary header

The format of this header remains unchanged between HaxBall updates and is safe to read.

The header is written in big endian.

magic_number uint8[4];
version uint32;
replay_duration uint32;

magin_number: This is the string "HBR2" or alternatively it can be interpreted as an uint32 0x48425232. It is advisable to verify that this number matches.

version: This is the replay version that should be included in the ?v=<replayer_version> part of the url.

replay_duration: This is the duration of the replay in logic frames, each frame is 1/60th of a second.
Troubleshooting
Cross-Origin Resource Sharing (CORS)

For the replays to work the replay file url must allow cross origin requests from https://www.haxball.com.

To allow this your server must include the header Access-Control-Allow-Origin and set it to either "*" or "https://www.haxball.com"
HTTP vs HTTPS urls

If your file url is HTTP instead of HTTPS then change HaxBall's url to match or it will fail to load.

For example:

This won't work: https://www.haxball.com/replay?v=3#http://haxball.github.io/haxball-replays/sample_replay.hbr2

But this will: http://www.haxball.com/replay?v=3#http://haxball.github.io/haxball-replays/sample_replay.hbr2