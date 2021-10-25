<script>
    import { page } from '$app/stores'
</script>

<div class="nav_container">
    <div class="nav_content">
        <a href="/">
            <h1>
                Masaya's Thoughts
            </h1>
        </a>
        <nav>
            <a 
            href="/"
            class={$page.path === '/' ? 'active' : ''}
            >Home</a>
            <a 
            href="/blog" 
            class={$page.path === '/blog' ? 'active' : ''}
            >Blog</a>
            <a 
            href="/about"
            class={$page.path === '/about' ? 'active' : ''}
            >About</a>
        </nav>

    </div>
</div>

<style>
    @import '/static/styles/_variables.css';

    .nav_container {
        display: flex;
        justify-content: center;
        margin: 0 auto;
        width: 100%;
        padding: 5% 10% 0 10%;
        max-width: 1280px;
        /* border: 1px solid red;  */
    }
    .nav_content {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        margin: 0 auto;
        width: 100%;
        border-bottom: 2px solid var(--azure_blue);
    }
    h1 {font-size: 2.8rem}
    a, h1 {line-height: 1; margin: 0}
    a {font-family: var(--head); text-decoration: none; color: var(--prussian_blue); font-size: 125%; font-weight: 600; transition: color .2s ease-in-out}
    a:hover, a.active {color: var(--azure_blue)}
    nav a:nth-of-type(even) {
        margin: 0 1.8rem;
    }
    @media(max-width: 767px) {
        .nav_container {padding: 7.5%}
        .nav_content {
            flex-direction: column;
            justify-content: flex-start;
            padding-top: 5vmax;
            align-items: center;
        }
        nav {display: flex; justify-content: center; width: 100%; margin-top: 2.5rem}
        nav a {font-size: 135%; flex-grow: 1; text-align: center; padding: 1rem 0 .25rem 0;}
        nav a:nth-of-type(even) {margin: 0;}
        nav a:hover, a.active {background: var(--prussian_blue); color: var(--ivory)}
    }
</style>