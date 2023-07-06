<script>
import './seo.css';
import img_SEO from '$lib/images/Mobile-search.svg';
import img_Trees from '$lib/images/avocado-tree.svg';
import img_StarFill from '$lib/images/star-fill.svg';
import img_Fiverr from '$lib/images/fiverr.svg';
import img_Icon from '$lib/images/icon.svg';
function redirect_offer() {
    window.open("https://fr.fiverr.com/s2/240ba8aec2", "_blank");
}
function redirect_profile() {
    window.open("https://www.fiverr.com/hyverno", "_blank");
}
</script>

<svelte:head>
    <title>
        How can i get my site referenced?
    </title>
	<meta name="description" content="Services specialising in web referencing and optimisation (SEO) for 3 years">
    <meta name="keywords" content="SEO, web, referencing, optimisation, website, page, google, search, engine, optimise, optimised, optimisation, optimised, optimise">
    <meta name="author" content="Hyverno">
    <meta name="robots" content="index, follow">
    <meta name="revisit-after" content="1 days">
    <meta name="language" content="English">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta property="og:title" content="How can i get my site referenced?">
    <meta property="og:description" content="Services specialising in web referencing and optimisation (SEO) for 3 years">
</svelte:head>

<nav>
    <img class="icon" src={img_Icon} alt="icon for the website"/>

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
            <button on:click={redirect_profile} class="sec">look at the other offers</button>
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
            <svg class="icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#359756" viewBox="0 0 16 16">
                <path d="M6.002 5.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/>
                <path d="M2.002 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2h-12zm12 1a1 1 0 0 1 1 1v6.5l-3.777-1.947a.5.5 0 0 0-.577.093l-3.71 3.71-2.66-1.772a.5.5 0 0 0-.63.062L1.002 12V3a1 1 0 0 1 1-1h12z"/>
            </svg>
            <span>
                <h3>Image Optimisation</h3>
                <p>
                    Their weight and loading time can have an impact on referencing.
                </p>
            </span>
        </div>
        <div class="card">
            <svg class="icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#359756" viewBox="0 0 16 16">
                <path fill-rule="evenodd" d="M14 4.5V14a2 2 0 0 1-2 2H8v-1h4a1 1 0 0 0 1-1V4.5h-2A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v9H2V2a2 2 0 0 1 2-2h5.5L14 4.5ZM3.186 15.29a1.176 1.176 0 0 1-.111-.449h.765a.578.578 0 0 0 .255.384c.07.049.153.087.249.114.095.028.202.041.319.041.164 0 .302-.023.413-.07a.559.559 0 0 0 .255-.193.507.507 0 0 0 .085-.29.387.387 0 0 0-.153-.326c-.101-.08-.255-.144-.462-.193l-.619-.143a1.72 1.72 0 0 1-.539-.214 1.001 1.001 0 0 1-.351-.367 1.068 1.068 0 0 1-.123-.524c0-.244.063-.457.19-.639.127-.181.303-.322.528-.422.224-.1.483-.149.776-.149.305 0 .564.05.78.152.216.102.383.239.5.41.12.17.186.359.2.566h-.75a.56.56 0 0 0-.12-.258.624.624 0 0 0-.247-.181.923.923 0 0 0-.369-.068c-.217 0-.388.05-.513.152a.472.472 0 0 0-.184.384c0 .121.048.22.143.3a.97.97 0 0 0 .405.175l.62.143c.218.05.406.12.566.211.16.09.285.21.375.358.09.148.135.335.135.56 0 .247-.063.466-.188.656a1.216 1.216 0 0 1-.539.439c-.234.105-.52.158-.858.158-.254 0-.476-.03-.665-.09a1.404 1.404 0 0 1-.478-.252 1.13 1.13 0 0 1-.29-.375Zm-3.104-.033A1.32 1.32 0 0 1 0 14.791h.765a.576.576 0 0 0 .073.27.499.499 0 0 0 .454.246c.19 0 .33-.055.422-.164.092-.11.138-.265.138-.466v-2.745h.79v2.725c0 .44-.119.774-.357 1.005-.236.23-.564.345-.984.345a1.59 1.59 0 0 1-.569-.094 1.145 1.145 0 0 1-.407-.266 1.14 1.14 0 0 1-.243-.39Z"/>
            </svg>
            <span>
                <h3>Script Optimisation</h3>
                <p>
                    The way in which the scripts are positioned and their content may be the key to solving the problem.
                </p>
            </span>
        </div>
        <div class="card">
            <svg class="icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#359756" viewBox="0 0 16 16">
                <path d="M8 4a.5.5 0 0 1 .5.5V6a.5.5 0 0 1-1 0V4.5A.5.5 0 0 1 8 4zM3.732 5.732a.5.5 0 0 1 .707 0l.915.914a.5.5 0 1 1-.708.708l-.914-.915a.5.5 0 0 1 0-.707zM2 10a.5.5 0 0 1 .5-.5h1.586a.5.5 0 0 1 0 1H2.5A.5.5 0 0 1 2 10zm9.5 0a.5.5 0 0 1 .5-.5h1.5a.5.5 0 0 1 0 1H12a.5.5 0 0 1-.5-.5zm.754-4.246a.389.389 0 0 0-.527-.02L7.547 9.31a.91.91 0 1 0 1.302 1.258l3.434-4.297a.389.389 0 0 0-.029-.518z"/>
                <path fill-rule="evenodd" d="M0 10a8 8 0 1 1 15.547 2.661c-.442 1.253-1.845 1.602-2.932 1.25C11.309 13.488 9.475 13 8 13c-1.474 0-3.31.488-4.615.911-1.087.352-2.49.003-2.932-1.25A7.988 7.988 0 0 1 0 10zm8-7a7 7 0 0 0-6.603 9.329c.203.575.923.876 1.68.63C4.397 12.533 6.358 12 8 12s3.604.532 4.923.96c.757.245 1.477-.056 1.68-.631A7 7 0 0 0 8 3z"/>
            </svg>
            <span>
                <h3>Natural Optimisation</h3>
                <p>
                    This is extremely important to avoid being blacklisted by Google and to keep the podium.
                </p>
            </span>
        </div>
        <div class="card">
            <svg class="icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#359756" viewBox="0 0 16 16">
                <path d="M2.5 3a.5.5 0 0 0 0 1h11a.5.5 0 0 0 0-1h-11zm5 3a.5.5 0 0 0 0 1h6a.5.5 0 0 0 0-1h-6zm0 3a.5.5 0 0 0 0 1h6a.5.5 0 0 0 0-1h-6zm-5 3a.5.5 0 0 0 0 1h11a.5.5 0 0 0 0-1h-11zm.79-5.373c.112-.078.26-.17.444-.275L3.524 6c-.122.074-.272.17-.452.287-.18.117-.35.26-.51.428a2.425 2.425 0 0 0-.398.562c-.11.207-.164.438-.164.692 0 .36.072.65.217.873.144.219.385.328.72.328.215 0 .383-.07.504-.211a.697.697 0 0 0 .188-.463c0-.23-.07-.404-.211-.521-.137-.121-.326-.182-.568-.182h-.282c.024-.203.065-.37.123-.498a1.38 1.38 0 0 1 .252-.37 1.94 1.94 0 0 1 .346-.298zm2.167 0c.113-.078.262-.17.445-.275L5.692 6c-.122.074-.272.17-.452.287-.18.117-.35.26-.51.428a2.425 2.425 0 0 0-.398.562c-.11.207-.164.438-.164.692 0 .36.072.65.217.873.144.219.385.328.72.328.215 0 .383-.07.504-.211a.697.697 0 0 0 .188-.463c0-.23-.07-.404-.211-.521-.137-.121-.326-.182-.568-.182h-.282a1.75 1.75 0 0 1 .118-.492c.058-.13.144-.254.257-.375a1.94 1.94 0 0 1 .346-.3z"/>
            </svg>
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
            <h2 class="title">Why use natural reference</h2>
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
            <button on:click={redirect_profile} class="sec">look at the other offers</button>
        </div>
    </div>    
</section>

<section class="reviews">
    <div class="elements">
        <div class="element">
            <div class=header>
                <h5>Guillaume Batier</h5>

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
    <span>
        <img class="icon" src={img_Icon} alt="icon for the website"/>
        <p>
            Fiverr link : <a href="https://www.fiverr.com/hyverno" target="_blank">fiverr.com/hyverno</a>
        </p>
    </span>
    <span>© 2023 Hyverno. All rights reserved.</span>
</footer>