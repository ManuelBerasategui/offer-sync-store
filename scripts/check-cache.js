async function test() {
  const imgPath = '/api/img?url=https%3A%2F%2Fdybzgnmghisqapdzgknv.supabase.co%2Fstorage%2Fv1%2Fobject%2Fpublic%2Fstore-images%2Foptimized%2Fproducts%2F5c95fd06061d5b56_11fbfc85497a7e66.webp';
  const imgUrl = "https://teimportamosarg.com" + imgPath;
  console.log("Testing fetch of:", imgUrl);
  const r1 = await fetch(imgUrl);
  console.log("Status 1:", r1.status);
  console.log("Headers 1:", [...r1.headers.entries()]);

  const r2 = await fetch(imgUrl);
  console.log("Status 2:", r2.status);
  console.log("Headers 2:", [...r2.headers.entries()]);
}
test();
