import{KB as s}from"./site-2b4kfzt8.js";var d=!1;function h(){if(d)return;d=!0,s.prototype.getRenderPassNames=function(){return this._renderPassNames},s.prototype.getCurrentRenderPassName=function(){return this._renderPassNames[this.currentRenderPassId]},s.prototype.createRenderPassId=function(r){let e=++s._RenderPassIdCounter;return this._renderPassNames[e]=r??"NONAME",e},s.prototype.releaseRenderPassId=function(r){this._renderPassNames[r]=void 0;for(let e=0;e<this.scenes.length;++e){let o=this.scenes[e];for(let n=0;n<o.meshes.length;++n){let t=o.meshes[n];if(t._releaseRenderPassId(r),t.subMeshes)for(let a=0;a<t.subMeshes.length;++a)t.subMeshes[a]._removeDrawWrapper(r)}}}}
export{h as Fm};

//# debugId=4C85300DDBEEF64364756E2164756E21
//# sourceMappingURL=site-tp9dcae6.js.map
