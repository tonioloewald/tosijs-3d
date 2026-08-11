class q{constructor(b,k,l,z){this.x=b,this.y=k,this.width=l,this.height=z}toGlobal(b,k){return new q(this.x*b,this.y*k,this.width*b,this.height*k)}toGlobalToRef(b,k,l){return l.x=this.x*b,l.y=this.y*k,l.width=this.width*b,l.height=this.height*k,this}clone(){return new q(this.x,this.y,this.width,this.height)}}
export{q as UA};

//# debugId=F57517500374877A64756E2164756E21
//# sourceMappingURL=site-vmpffs87.js.map
