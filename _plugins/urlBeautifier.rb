module Jekyll
	module URLBeautifier
		##
		# Remove ending "index.html" or ".html" if present.
		def beautify_url(url)
			beautify_resource(beautify_directory(url))
		end

		##
		# Remove ending "index.html" from urls.
		def beautify_directory(url)
			if url =~ /index\.html$/
				url = url[0..-11]
			end
			url
		end

		##
		# Remove ending ".html".
		def beautify_resource(url)
			if url =~ /\.html$/
				url = url[0..-6]
			end
			url
		end

		##
		# Remove ending "index.html" from urls.
		def lower_title(title)
			title.downcase
		end
	end
end

Liquid::Template.register_filter(Jekyll::URLBeautifier)
