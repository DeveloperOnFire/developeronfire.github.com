---
layout: post
title: Your Understanding is an Approximation
author: Dave Rael
---

### An Interview Worth a Listen
It was a joy and a pleasure that [I was interviewed by Jeff Meyerson for the Software Engieering Daily podcast](https://softwareengineeringdaily.com/2017/02/01/developer-on-fire-with-dave-rael/).  Software Engineering Daily has quite a bit in common with Developer On Fire.  There is a similarity in purpose, but a difference in approach.  I recommend listening to both podcasts to gain insight into technology, humanity, engineering, and practice from different perspectives.  [Jeff was on Developer On Fire as well](http://developeronfire.com/podcast/episode-211-jeff-meyerson-software-and-business-for-humans) and I'm pleased with both episodes.

### Physics And Software
During my appearance on SE Daily, Jeff asked me about my physics background and how that related to my career in software.  The question surprised me and I don't think I had the right answer to the question in the moment.  I sounded like a reasonably thoughtful person in making a comparison in the moment, but [I don't think I really framed the parallel in my mind until some later reflection](https://sivers.org/slow).  I had a bit of a ["jerk store"](https://www.youtube.com/watch?v=LOetkFopHK0) moment when I later realized what I should have said in response to the question.

### Classical (Newtonian) Physics
Isaac Newton is the father of classical physics.  The laws of motion you learned in your freshman physics class are attributable to Newton.  They describe the forces that act on a body and the way bodies are moved by said forces.  It's a complex and beautiful tapesty of action, reaction, and a competition of force and resistance.

And it's wrong.

![physics](/assets/images/blog/physics.jpg)

The thing is, Newtonian physics falls short of describing the universe as it is.  Newton was brilliant and moved the ball forward in staggering ways.  His contibutions to the understanding of humans of the natural universe in which we live are rivaled only by an elite handful of amazing discoverers.

Still, later physicist were able to refine Newton's understanding to build on what came before and better describe the workings of what surrounds us.  It turns out that relativity and quantum mechanics show the inadequacies of classical physics and add more complexity to better model the real world and the real universe in a more complete way that renders the classical view obsolete.

Or so you might think.

### Good Enough
Classical physics still tells a remarkably accurate story about the movement of objects in the real world.  In fact, it's only in extreme situations like with objects moving at close to the speed of light or in trying to understand subatomic particle interactions that there's any perceptbile deviation in the descriptions of Newtonian physics from the real world.

Thus, the model used by classical physics is good enough for almost any practical purpose in the normal operation of daily life.

The model is an approximation of sufficient copmlexity to tell a useful story for most purposes.

### The Lesson for Software
![lesson](/assets/images/blog/lesson.jpg)

Modeling a domain in software has a lot in common with modeling the real world mathematially, as is the exercies of physics.  We, software developers, seldom have a complete understanding of the domain we are trying to tackle - of the problem we are trying to solve.  In real systems, our domain experts also usually lack a compelete understanding.  The discipline of software development is one involving an ever-growing understanding of the world described by the model.

This is the key thing software development has in common with the natural sciences.

In software, as your understanding of the problem increases, old abstractions change in their utility.  It may be that at different levels of abstraction, a more primitive or a less complete understanding of the domain should be exposed.  In [the Gang of Four Design Patterns book](https://www.amazon.com/dp/0201633612/?tag=devonfir-20), the [Adapter Pattern](https://en.wikipedia.org/wiki/Adapter_pattern) describes presenting a different interface over a given abstraction or implementation.  This is often useful to share a simplified form of a concept, perhaps with useful defaults or a form of guidance toward the [Pit of Success](https://blog.codinghorror.com/falling-into-the-pit-of-success/).

The view of reailty expressed by Newtonian physics are exactly that - a useful adapter at the right level of abstraction for many of the phenomena we seek to describe in the real world.

As understanding evolves, old ways of looking at a problem are not necessarily to be discarded, but to be used when their shortcomings, incompleteness, or naiveté are not of critical importance or are negligible.

Software professionals and hobbyists should keep in mind, as well, that the maturity of our current understanding is always incomplete.  Like quantum physics, our current state is not our end state.  Human discovery and domain learning yield ever-improving insight.  A better understanding is always possbile and any approrach toward knowing all there is to know will be asymptotic.

### The Real Lesson
Lest a software team fall into the trap of insurmountable hubris concealing an incomplete understanding, heed this admonition: Even the great Isaac Newton, in advancing the understanding of humanity by orders of magnitude, left further discovery for later participants in the advance of science.  Thinking ourselves beyond reproach and with complete knowledge is a mistake with grave consequences.  Approaching software tasks with humility is of critical importance.  The humility that knows that there is another insight that may improve the model and that the source of that insight may be unexpected is an outstanding lesson we geeks can take ways from the content and history of hard science.
