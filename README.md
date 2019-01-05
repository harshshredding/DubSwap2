# DubSwap
DubSwap is an internal college applicaton(this can change) with two objectives :
* Help college students rent textbooks(and potentially some other stuff) to each other at good(low) prices.
> An example scenario : A student realized that he was forced to buy a textbook for some class because he had no luck online. He has two options, either he can sell the texbook back to the book-store, or he can rent out his textbook to a student every  quarter for $50, potentially making significant money off of textbooks by the time she graduates.
* `Not intended to be a dating site`. [This idea is based on research by Dan Ariely in MIT](http://danariely.com/2010/09/20/online-dating-avoiding-a-bad-equilibrium/). Help college students meet new people and build a strong network by creating opportunities to engage in conversations that are not bland. A bland conversation does not involve much critical thinking or listening and involves a lot of small talk. A conversation which is <i>not</i> bland is a 'shared-experience' and it is seen to lay foundations for a long-lasting, strong relationship. We plan to eliminate blandness from conversation by organising conversations around topics (subjects people should talk about). An agreed upon subject will make people more confortable around others, and if the subject is something both parties are excited about, the conversation can turn out to be very rich very quickly. This project also aligns with my goal to accelerate human learning.
> An example scenario : A student wants to talk about Operating Systems on a Friday evening with other people. So she will place a pin on the map to indicate the location where she would like to meet and tag the location with the topic "Wanna talk about Operating Systems or why Windows sucks or doesn't ?". She will notified of people who are interested in the meeting she created, and she can converse with them in a group chat. Every person planning on attending the meeting can indicate how inclined they are to meet. If a person lies about their strong inclination by not attending the meeting, they will loose rating. If she happens to enjoy the meeting, she can add the people in the meeting as her friends and also easily arrange to meet again with the same group to discuss the same(or related) topic.  

## Why Contribute ? ##
* Have fun building a real-time web-application with lots of moving parts.
* Get a sense of how network programming (we deal with sockets :D) for the web tastes, feels, and looks. 
* Since dubswap is supposed to be internal, you will get exerience with making web-comminication secure (We will prevent rainbow attacks, SQL injection, etc).
* Deliver something that could potentially be very useful.
* Get familiar with the software development regime : Testing, Git, Linting, etc ...
* The project is in its early stages, so it should be easy to jump in with my help, and hopefully I have written clean code.

## How to Contribute ? ##
### On Mac (it shouldn't be hard to find Windows counterparts) ###
Find a sparkling clearn directory and pull in the repo <br>
`git clone https://github.com/harshshredding/DubSwap2.git` <br>
Install Node using Homebrew <br>
`brew install node` <br>
Install Postgres <br>
`brew intall postgres` <br>
[Visit this link to learn about how to start, quit, and configure postgres to allow all local connections](https://stackoverflow.com/questions/7975556/how-to-start-postgresql-server-on-mac-os-x) <br>
Then will will create a database called dubswap. <br>
`CREATE DATABASE dubswap;`
Then we will add users called `ubuntu` and `postgres` to the database and give them super priviledge. <br>
`CREATE USER ubuntu SUPERUSER;` <br>
`CREATE USER postgres SUPERUSER;` <br>
Then we will import all the tables in the database from the backup-file. <br>
In the repository do <br>
`psql dubswap < DubSwap2/dubswap-books/db/dubswap_backup.sql` <br>
You should not see any errors popping up <br>
Install ElasticSearch <br>
`brew install elasticsearch` <br>

## Case for the book trading feature ##
College communities are different than other communities. People in college form a network that is densely connected, and college students work in close proximities. Hence, a delivery system should not be necessary for a trading market involving college students, making it easier to reduce prices of goods for everyone's benefit. Also, since college students tend to be *well behaved*, there is a low chance of getting cheated by another college student during a trade.

## Case for meeting feature ##
One way to build a meaningful connection with anyone is by sharing an experience with that person. A shared experience can involve things like solving a puzzle together, working on a project together, or going to a concert together. This application is aimed to generate shared experiences by bringing people together to discuss a topic of their interest. When these people meet, they can skip small talk and quickly dive deep into conversations that - in the best case scenario - can involve quite a bit of critical thinking and problem solving.   
