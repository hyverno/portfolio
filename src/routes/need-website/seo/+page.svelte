<script>
import './seo.css';
import img_SEO from '$lib/images/Mobile-search.svg';
import img_Trees from '$lib/images/avocado-tree.svg';
import img_StarFill from '$lib/images/star-fill.svg';
import img_Fiverr from '$lib/images/fiverr.svg';
function redirect_offer() {
    window.open("https://fr.fiverr.com/s2/240ba8aec2", "_blank");
}
function redirect_profil() {
    window.open("https://www.fiverr.com/hyverno", "_blank");
}
</script>

<svelte:head>
    <title>
        Hyverno - SEO optimisation and referencing of your web page
    </title>
	<meta name="description" content="Services specialising in web referencing and optimisation (SEO) for 3 years">
    <meta name="keywords" content="SEO, web, referencing, optimisation, website, page, google, search, engine, optimise, optimised, optimisation, optimised, optimise">
    <meta name="author" content="Hyverno">
    <meta name="robots" content="index, follow">
    <meta name="revisit-after" content="1 days">
    <meta name="language" content="English">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta property="og:title" content="Hyverno - SEO optimisation and referencing of your web page">
    <meta property="og:description" content="Services specialising in web referencing and optimisation (SEO) for 3 years">
</svelte:head>

<nav>
    <div class="icon"></div>

    <div class="contact">
        <a href="https://fr.fiverr.com/s2/240ba8aec2" target="_blank"><img src={img_Fiverr} alt="icon Fiverr"></a>
    </div>
</nav>

<header>
    <div>
        <h1 class="title">
            Are you looking <br>
            for an optimised <br>
            and referenced <br>
            web page? <br>
        </h1>
        <span class="sub">
            bids and purchases are made <b><u>in a secure manner</u></b>
        </span>
        <div class="btn">
            <button on:click={redirect_offer}>buy the offer</button>
            <button on:click={redirect_profil} class="sec">look at the other offers</button>
        </div>
    </div>

    <div>
        <img src={img_SEO} alt="">
    </div>
</header>

<section class="opt">
    <span>
        <h2 class="title">What we are going to achieve</h2>
        <div class="sep"></div>
    </span>
    <div class="cards">
        <div class="card">
            <div class="icon"></div>
            <span>
                <h3>Image Optimisation</h3>
                <p>
                    Their weight and loading time can have an impact on referencing.
                </p>
            </span>
        </div>
        <div class="card">
            <div class="icon"></div>
            <span>
                <h3>Script Optimisation</h3>
                <p>
                    The way in which the scripts are positioned and their content may be the key to solving the problem.
                </p>
            </span>
        </div>
        <div class="card">
            <div class="icon"></div>
            <span>
                <h3>Natural Optimisation</h3>
                <p>
                    This is extremely important to avoid being blacklisted by Google and to keep the podium.
                </p>
            </span>
        </div>
        <div class="card">
            <div class="icon"></div>
            <span>
                <h3>KeyWord Optimisation</h3>
                <p>
                    They are important in order to target customers or key words to be found.
                </p>
            </span>
        </div>
    </div>
</section>

<section class="arg">
    <img src={img_Trees} alt="">
    <div class="txt">
        <span>
            <h2 class="title">Why use natural referencement</h2>
            <div class="sep"></div>
            <p
                class="sub">
                Natural referencing, also known as search engine optimization (SEO), is crucial for businesses 
                and websites to improve their visibility and organic traffic from search engines. By optimizing 
                their online content and following best practices, websites can rank higher in search engine 
                results pages (SERPs). This leads to increased visibility, more targeted organic traffic, and 
                ultimately, better chances of attracting potential customers or users. Natural referencing helps 
                businesses establish a strong online presence, gain credibility, and compete effectively in the 
                digital landscape.  
            </p>
        </span>
        <div class="btn">
            <button on:click={redirect_offer}>buy the offer</button>
            <button on:click={redirect_profil} class="sec">look at the other offers</button>
        </div>
    </div>    
</section>

<section class="reviews">
    <div class="elements">
        <div class="element">
            <div class=header>
                <h5>guillaumebatier</h5>

                <span class="stars">
                    <img src={img_StarFill} alt="star icon">
                    <img src={img_StarFill} alt="star icon">
                    <img src={img_StarFill} alt="star icon">
                    <img src={img_StarFill} alt="star icon">
                    <img src={img_StarFill} alt="star icon">
                </span>

            </div>
            <div class="sep"></div>
            <p>
                The request was well understood, the feedback was very quick and the code was very clean. I highly recommend it!
            </p>
        </div>
    </div>
</section>

<footer>
    <div class="logo"></div>
    <p>
        Fiverr link : <a href="https://www.fiverr.com/hyverno" target="_blank">fiverr.com/hyverno</a>
    </p>
    <span>© 2023 Hyverno. All rights reserved.</span>
</footer>