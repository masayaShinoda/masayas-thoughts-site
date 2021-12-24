<script context="module">
  	export const prerender = true
</script>
<script>
  export let title
  export let dateWritten
  export let thumbnail
</script>
   
  
<svelte:head>
  {#if title}
    <title>{title} | Masaya's Thoughts</title>
    {:else}
    <title>Masaya's Thoughts</title>
  {/if}

  <meta name="author" content="Masaya Shida">
  <meta name="description" content="Blog article written by Masaya Shida.">

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:title" content={title}>
  <meta property="og:description" content={`Written ${dateWritten}`}>
  <meta property="og:image" content={thumbnail}>

</svelte:head>