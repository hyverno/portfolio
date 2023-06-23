const route = (event: any) => {
    event = event || window.event;
    event.preventDefault();
    window.history.pushState({}, "", event.target.href);
    handleLocation();
};

const prefixe = "/src/pages/";

const routes: { [key: string]: string } = {
    // 404: "/pages/404.html",
    "/home": "/home.html",
    "/*": "/home.html",
};

const handleLocation = async () => {
    const path = window.location.pathname;
    const route = routes[path] || routes["/*"];

    // important to use this prefixe to avoid Fetch API error
    const html = await fetch(prefixe + route).then((data) => data.text())
    const inject = document.getElementById("App")
    if(inject) {
        const fragment = document.createRange().createContextualFragment(html)
        inject.appendChild(fragment)
    }

};

window.onpopstate = handleLocation;
// window.route = route;

handleLocation();