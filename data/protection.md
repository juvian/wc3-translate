When your map is protected, MPQ editor will show it as read-only.

![read-only](/images/read_only.png)

There are complex ways of deprotecting that depends on the protection used. Here I will just give a simpler method that might make a few custom ui missing but on the whole map should work. This method is extracting all the files and add them to a new unprotected mpq. 

While that sounds simple, extracting the file is kind of useless without knowing its name, because if you reimport it with a random name it won't work. So this method involves finding out the names of the files... aka name breaking. MPQ Editor has a name breaking feature if you go to tools -> w3x Name Scanner

![read-only](/images/name_scanner.png)

After clicking there, just hit the first scan button and it will try to find out the names. This can take even an hour depending on how protected is the map. When that is done, you will have several options of what to do with the name list.

![read-only](/images/name_scanner_list.png)

Choose Save List and put save it wherever, usually in same folder as your map is a good choice. You could apply this list and then extract the files directly with MPQ Editor but that doesn't work well on some maps so better use my tool.

Run `node scripts/findListFile.js yourwc3map list.txt folderPath ladik.txt` where yourwc3map is the path to your w3x, list.txt is the path to where you want to store the name list, folderPath is where you want to extract the files and the rest of the parameters are optionally additional name lists to consider (as my tool also does name breaking in another way). Between ladik and mine, you should have most of the useful files found and extracted.

With this we can build a new mpq. Copy [Empty map](/data/emptyMap.w3x) somewhere and then use MPQ Master to open it (not sure if MPQ Editor doesn't support adding files from directoy or I never found how). Right click and choose add Directory

![read-only](/images/mpq_master.png)

Choose the folder where you extracted the files with previous command and when it finishes just close window. Now your map has all the files and you can rename it. Open it with mpq editor and finally add the translated files to it.


