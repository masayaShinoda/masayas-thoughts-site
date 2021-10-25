<div class="hero">
    <span>
        <h1>How I see the world.</h1>
        <p>
            This is a place for a {new Date().getFullYear() - 2002} year old from Cambodia to share his thoughts and worldview. I write about my take on current events, history, mental health, and sharing about my personal experiences in life.
        </p>
    </span>
    <br />
    <span>
        <a href="/blog">Read</a>
        <a href="/about" class="secondary_link">About me</a>


    </span>
</div>


<style>
    .hero h1 {
        font-size: 4.5rem;
        /* margin-bottom: 1.5rem; */
    }
    @media(max-width: 767px) {
        .hero h1 {font-size: 3.6rem}
    }
    a {font-size: 135%; flex-grow: 1; text-align: center; padding: 0.8rem 2.1rem; text-decoration: none; transition: background .2s ease-in-out;}
    a {background: var(--prussian_blue); color: var(--ivory)}
    a:hover {background: var(--azure_blue)}
    .secondary_link, .secondary_link:hover {
        background: none;
        color: var(--prussian_blue);
    }
</style>