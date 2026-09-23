import{YC as s}from"./site-5f0p5gj6.js";var d=!1;function h(){if(d)return;d=!0,s.prototype.getRenderPassNames=function(){return this._renderPassNames},s.prototype.getCurrentRenderPassName=function(){return this._renderPassNames[this.currentRenderPassId]},s.prototype.createRenderPassId=function(r){let e=++s._RenderPassIdCounter;return this._renderPassNames[e]=r??"NONAME",e},s.prototype.releaseRenderPassId=function(r){this._renderPassNames[r]=void 0;for(let e=0;e<this.scenes.length;++e){let o=this.scenes[e];for(let n=0;n<o.meshes.length;++n){let t=o.meshes[n];if(t._releaseRenderPassId(r),t.subMeshes)for(let a=0;a<t.subMeshes.length;++a)t.subMeshes[a]._removeDrawWrapper(r)}}}}
export{h as Nm};

//# debugId=B9D1277DAC5109AC64756E2164756E21
//# sourceMappingURL=site-at7ajk68.js.map
